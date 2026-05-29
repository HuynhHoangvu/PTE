import {
  Controller, Get, Patch, Param, Body, UseGuards, Request,
  ForbiddenException, NotFoundException, Query, Post, Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserPlan, UserRole } from '../users/user.entity';
import { MockTest, MockTestAttempt, MockTestAttemptStatus } from '../mock-test/mock-test.entity';
import { Attempt } from '../attempts/attempt.entity';
import { Question } from '../questions/question.entity';

class UpdateUserDto {
  plan?: UserPlan;
  role?: UserRole;
  fullName?: string;
  isActive?: boolean;
  password?: string;
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(MockTest) private mockTestRepo: Repository<MockTest>,
    @InjectRepository(MockTestAttempt) private mockAttemptRepo: Repository<MockTestAttempt>,
    @InjectRepository(Attempt) private attemptRepo: Repository<Attempt>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    private dataSource: DataSource,
  ) {}

  private checkAdmin(req: any) {
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.TEACHER) {
      throw new ForbiddenException('Admin or Teacher only');
    }
  }

  @Get('users')
  async listUsers(
    @Request() req,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    this.checkAdmin(req);
    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = (parseInt(page) - 1) * take;

    const listOpts = {
      select: ['id', 'email', 'fullName', 'plan', 'role', 'streakDays', 'totalAttempts', 'averageScore', 'createdAt', 'lastActiveAt', 'loginCount', 'lastLoginAt', 'isActive'] as (keyof User)[],
      order: { createdAt: 'DESC' as const },
      take,
      skip,
    };

    const [users, total] = search
      ? await this.userRepo.findAndCount({
          ...listOpts,
          where: [{ email: Like(`%${search}%`) }, { fullName: Like(`%${search}%`) }],
        })
      : await this.userRepo.findAndCount({ ...listOpts });

    return { users, total, page: parseInt(page), limit: take };
  }

  @Get('users/:id')
  async getUser(@Request() req, @Param('id') id: string) {
    this.checkAdmin(req);
    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'plan', 'role', 'streakDays', 'totalAttempts', 'averageScore', 'createdAt', 'lastActiveAt', 'loginCount', 'lastLoginAt', 'isActive'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Patch('users/:id')
  async updateUser(@Request() req, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    this.checkAdmin(req);
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.plan !== undefined) user.plan = dto.plan;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password !== undefined && dto.password.trim() !== '') {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    await this.userRepo.save(user);
    const { password, ...rest } = user as any;
    return rest;
  }

  @Get('users/:id/mock-tests')
  async getUserMockTests(@Request() req, @Param('id') id: string) {
    this.checkAdmin(req);
    const attempts = await this.mockAttemptRepo.find({
      where: { userId: id },
      relations: ['mockTest'],
      order: { createdAt: 'DESC' },
    });
    return attempts;
  }

  @Get('stats')
  async getStats(@Request() req) {
    this.checkAdmin(req);
    const totalUsers = await this.userRepo.count();
    const premiumUsers = await this.userRepo.count({ where: { plan: UserPlan.PREMIUM } });
    const totalAttempts = await this.attemptRepo.count();
    const completedTests = await this.mockAttemptRepo.count({ where: { status: MockTestAttemptStatus.COMPLETED } });
    const loginAgg = await this.dataSource.query(`
      SELECT COALESCE(SUM("loginCount"), 0)::text AS total_logins,
             COUNT(*) FILTER (WHERE COALESCE("loginCount", 0) > 0)::text AS users_with_login
      FROM users
    `);
    return {
      totalUsers,
      premiumUsers,
      totalAttempts,
      completedTests,
      totalLoginEvents: Number(loginAgg[0]?.total_logins ?? 0),
      usersWithAtLeastOneLogin: Number(loginAgg[0]?.users_with_login ?? 0),
    };
  }

  // ── Analytics: Platform Overview ─────────────────────────────────────────
  @Get('analytics/overview')
  async getAnalyticsOverview(@Request() req) {
    this.checkAdmin(req);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(today); week.setDate(today.getDate() - 7);
    const month = new Date(today); month.setDate(today.getDate() - 30);

    const [totalUsers, premiumUsers, activeToday, activeThisWeek, activeThisMonth, totalAttempts, totalMockTests] =
      await Promise.all([
        this.userRepo.count(),
        this.userRepo.count({ where: { plan: UserPlan.PREMIUM } }),
        this.dataSource.query(`SELECT COUNT(DISTINCT "userId") FROM attempts WHERE "createdAt" >= $1`, [today]),
        this.dataSource.query(`SELECT COUNT(DISTINCT "userId") FROM attempts WHERE "createdAt" >= $1`, [week]),
        this.dataSource.query(`SELECT COUNT(DISTINCT "userId") FROM attempts WHERE "createdAt" >= $1`, [month]),
        this.attemptRepo.count(),
        this.mockAttemptRepo.count({ where: { status: MockTestAttemptStatus.COMPLETED } }),
      ]);

    const [bySkill, byType, byTypeAllTime, dailyTrend, loginAgg] = await Promise.all([
      this.dataSource.query(`
      SELECT q.skill, COUNT(a.id)::text AS cnt
      FROM attempts a
      JOIN questions q ON a."questionId" = q.id
      WHERE a."createdAt" >= $1
      GROUP BY q.skill
      ORDER BY cnt DESC
    `, [month]),
      this.dataSource.query(`
      SELECT q.type, COUNT(a.id)::text AS cnt
      FROM attempts a
      JOIN questions q ON a."questionId" = q.id
      WHERE a."createdAt" >= $1
      GROUP BY q.type
      ORDER BY cnt DESC
    `, [month]),
      this.dataSource.query(`
      SELECT q.type, COUNT(a.id)::text AS cnt
      FROM attempts a
      JOIN questions q ON a."questionId" = q.id
      GROUP BY q.type
      ORDER BY cnt DESC
    `),
      this.dataSource.query(`
      SELECT DATE("createdAt") AS day,
             COUNT(id)::text AS cnt,
             COUNT(DISTINCT "userId")::text AS users
      FROM attempts
      WHERE "createdAt" >= $1
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `, [new Date(today.getTime() - 14 * 86400000)]),
      this.dataSource.query(`
      SELECT COALESCE(SUM("loginCount"), 0)::text AS total_logins,
             COUNT(*) FILTER (WHERE COALESCE("loginCount", 0) > 0)::text AS users_with_login
      FROM users
    `),
    ]);

    return {
      totalUsers,
      premiumUsers: Number(premiumUsers),
      activeToday: Number(activeToday[0]?.count ?? 0),
      activeThisWeek: Number(activeThisWeek[0]?.count ?? 0),
      activeThisMonth: Number(activeThisMonth[0]?.count ?? 0),
      totalAttempts,
      totalMockTests,
      bySkill: bySkill.map(r => ({ skill: r.skill, count: Number(r.cnt) })),
      byType: byType.map(r => ({ type: r.type, count: Number(r.cnt) })),
      byTypeAllTime: byTypeAllTime.map(r => ({ type: r.type, count: Number(r.cnt) })),
      dailyTrend: dailyTrend.map(r => ({ day: r.day, attempts: Number(r.cnt), users: Number(r.users) })),
      loginStats: {
        totalLoginEvents: Number(loginAgg[0]?.total_logins ?? 0),
        usersWithAtLeastOneLogin: Number(loginAgg[0]?.users_with_login ?? 0),
      },
    };
  }

  // ── Analytics: Enhanced user list with activity stats ────────────────────
  @Get('analytics/users')
  async getAnalyticsUsers(
    @Request() req,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('sortBy') sortBy = 'lastActive',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @Query('skill') skill?: string,
    @Query('plan') plan?: string,
    @Query('activeIn') activeIn?: string, // 'today'|'week'|'month'|'all'
  ) {
    this.checkAdmin(req);
    const take = Math.min(parseInt(limit) || 20, 100);
    const pageNum = parseInt(page) || 1;
    const skip = (pageNum - 1) * take;

    const now = new Date();
    const cutoffMap: Record<string, Date> = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      week: new Date(now.getTime() - 7 * 86400000),
      month: new Date(now.getTime() - 30 * 86400000),
    };

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      conditions.push(`(u.email ILIKE $${pIdx} OR u."fullName" ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }
    if (plan) {
      conditions.push(`u.plan = $${pIdx}`);
      params.push(plan);
      pIdx++;
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sort mapping
    const sortMap: Record<string, string> = {
      lastActive: 'last_active',
      totalAttempts: 'total_attempts',
      avgScore: 'avg_score',
      createdAt: 'u."createdAt"',
      email: 'u.email',
      loginCount: 'u."loginCount"',
    };
    const sortCol = sortMap[sortBy] || 'last_active';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Active filter subquery
    const activeFilter = activeIn && cutoffMap[activeIn]
      ? `AND a."createdAt" >= '${cutoffMap[activeIn].toISOString()}'`
      : '';

    // skill filter applied inside subquery so skill breakdown is always shown, but WHERE filters rows
    const skillHaving = skill
      ? `AND COALESCE(stats.${skill.toLowerCase()}_cnt, 0) > 0`
      : '';

    const [rows, countResult]: [any[], any[]] = await Promise.all([
      this.dataSource.query(`
        SELECT
          u.id, u.email, u."fullName", u.plan, u.role, u."isActive",
          u."createdAt" AS created_at,
          u."loginCount" AS login_count,
          u."lastLoginAt" AS last_login_at,
          stats.last_active,
          COALESCE(stats.total_attempts, 0)::int AS total_attempts,
          stats.avg_score,
          COALESCE(stats.speaking_cnt, 0)::int AS speaking_cnt,
          COALESCE(stats.writing_cnt, 0)::int AS writing_cnt,
          COALESCE(stats.reading_cnt, 0)::int AS reading_cnt,
          COALESCE(stats.listening_cnt, 0)::int AS listening_cnt,
          COALESCE(mock_stats.mock_cnt, 0)::int AS mock_cnt,
          mock_stats.mock_avg_score
        FROM users u
        LEFT JOIN (
          SELECT a."userId",
                 MAX(a."createdAt") AS last_active,
                 COUNT(a.id) AS total_attempts,
                 ROUND(AVG(a."totalScore")::numeric, 1) AS avg_score,
                 COUNT(CASE WHEN q.skill = 'SPEAKING' THEN 1 END) AS speaking_cnt,
                 COUNT(CASE WHEN q.skill = 'WRITING' THEN 1 END) AS writing_cnt,
                 COUNT(CASE WHEN q.skill = 'READING' THEN 1 END) AS reading_cnt,
                 COUNT(CASE WHEN q.skill = 'LISTENING' THEN 1 END) AS listening_cnt
          FROM attempts a
          LEFT JOIN questions q ON a."questionId" = q.id
          WHERE 1=1 ${activeFilter}
          GROUP BY a."userId"
        ) stats ON u.id = stats."userId"
        LEFT JOIN (
          SELECT m."userId",
                 COUNT(m.id) AS mock_cnt,
                 ROUND(AVG(m."totalScore")::numeric, 1) AS mock_avg_score
          FROM mock_test_attempts m
          WHERE m.status = 'COMPLETED'
          GROUP BY m."userId"
        ) mock_stats ON u.id = mock_stats."userId"
        ${whereSql} ${skillHaving}
        ORDER BY ${sortCol} ${order} NULLS LAST
        LIMIT ${take} OFFSET ${skip}
      `, params),
      this.dataSource.query(`
        SELECT COUNT(u.id)::text AS total
        FROM users u
        LEFT JOIN (
          SELECT a."userId", MAX(a."createdAt") AS last_active,
                 COUNT(CASE WHEN q.skill = 'SPEAKING' THEN 1 END) AS speaking_cnt,
                 COUNT(CASE WHEN q.skill = 'WRITING' THEN 1 END) AS writing_cnt,
                 COUNT(CASE WHEN q.skill = 'READING' THEN 1 END) AS reading_cnt,
                 COUNT(CASE WHEN q.skill = 'LISTENING' THEN 1 END) AS listening_cnt
          FROM attempts a
          LEFT JOIN questions q ON a."questionId" = q.id
          WHERE 1=1 ${activeFilter}
          GROUP BY a."userId"
        ) stats ON u.id = stats."userId"
        ${whereSql} ${skillHaving}
      `, params),
    ]);

    return {
      users: rows.map(r => ({
        id: r.id,
        email: r.email,
        fullName: r.fullName || null,
        plan: r.plan,
        role: r.role,
        isActive: r.isActive,
        createdAt: r.created_at,
        lastActiveAt: r.last_active,
        loginCount: r.login_count != null ? Number(r.login_count) : 0,
        lastLoginAt: r.last_login_at,
        totalAttempts: r.total_attempts,
        avgScore: r.avg_score ? Number(r.avg_score) : null,
        mockCount: r.mock_cnt,
        mockAvgScore: r.mock_avg_score ? Number(r.mock_avg_score) : null,
        skillBreakdown: {
          SPEAKING: r.speaking_cnt,
          WRITING: r.writing_cnt,
          READING: r.reading_cnt,
          LISTENING: r.listening_cnt,
        },
      })),
      total: Number(countResult[0]?.total ?? 0),
      page: pageNum,
      limit: take,
    };
  }

  // ── Analytics: Per-user detailed activity ────────────────────────────────
  @Get('analytics/users/:id')
  async getUserActivity(@Request() req, @Param('id') id: string) {
    this.checkAdmin(req);
    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'plan', 'role', 'createdAt', 'loginCount', 'lastLoginAt', 'isActive'],
    });
    if (!user) throw new NotFoundException('User not found');

    const [byType, recentAttempts, dailyActivity, mockAttempts] = await Promise.all([
      // Practice attempts grouped by question type
      this.dataSource.query(`
        SELECT q.skill, q.type,
               COUNT(a.id)::int AS cnt,
               ROUND(AVG(a."totalScore")::numeric, 1) AS avg_score,
               MAX(a."totalScore")::numeric AS best_score,
               MAX(a."createdAt") AS last_at
        FROM attempts a
        JOIN questions q ON a."questionId" = q.id
        WHERE a."userId" = $1
        GROUP BY q.skill, q.type
        ORDER BY cnt DESC
      `, [id]),
      // Last 20 practice attempts with score
      this.dataSource.query(`
        SELECT a.id, a."totalScore", a.status, a."createdAt",
               q.type, q.skill, q.code, q.title
        FROM attempts a
        JOIN questions q ON a."questionId" = q.id
        WHERE a."userId" = $1
        ORDER BY a."createdAt" DESC
        LIMIT 20
      `, [id]),
      // Daily activity last 30 days (practice + mock combined)
      this.dataSource.query(`
        SELECT day, SUM(cnt)::int AS cnt FROM (
          SELECT DATE(a."createdAt") AS day, COUNT(a.id) AS cnt
          FROM attempts a
          WHERE a."userId" = $1 AND a."createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(a."createdAt")
          UNION ALL
          SELECT DATE(m."createdAt") AS day, COUNT(m.id) AS cnt
          FROM mock_test_attempts m
          WHERE m."userId" = $1 AND m."createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(m."createdAt")
        ) combined
        GROUP BY day ORDER BY day ASC
      `, [id]),
      // All mock test attempts for this user
      this.dataSource.query(`
        SELECT m.id, m.status, m."totalScore", m."sectionScores",
               m."startedAt", m."completedAt", m."createdAt",
               t.code AS test_code, t.title AS test_title
        FROM mock_test_attempts m
        JOIN mock_tests t ON m."mockTestId" = t.id
        WHERE m."userId" = $1
        ORDER BY m."createdAt" DESC
      `, [id]),
    ]);

    return {
      user,
      byType: byType.map((r: any) => ({
        skill: r.skill, type: r.type, count: r.cnt,
        avgScore: r.avg_score ? Number(r.avg_score) : null,
        bestScore: r.best_score ? Number(r.best_score) : null,
        lastAt: r.last_at,
      })),
      recentAttempts: recentAttempts.map((r: any) => ({
        id: r.id, totalScore: r.totalScore != null ? Number(r.totalScore) : null,
        status: r.status, createdAt: r.createdAt,
        questionType: r.type, questionSkill: r.skill,
        questionCode: r.code, questionTitle: r.title,
      })),
      dailyActivity: dailyActivity.map((r: any) => ({ day: r.day, count: r.cnt })),
      mockAttempts: mockAttempts.map((r: any) => ({
        id: r.id, status: r.status,
        totalScore: r.totalScore != null ? Number(r.totalScore) : null,
        sectionScores: r.sectionScores,
        startedAt: r.startedAt, completedAt: r.completedAt, createdAt: r.createdAt,
        testCode: r.test_code, testTitle: r.test_title,
      })),
    };
  }

  // ── Mock Test CRUD ────────────────────────────────────────────────────────
  @Get('mock-tests')
  async listMockTests(@Request() req) {
    this.checkAdmin(req);
    return this.mockTestRepo.find({ order: { code: 'ASC' } });
  }

  @Post('mock-tests')
  async createMockTest(@Request() req, @Body() body: any) {
    this.checkAdmin(req);
    const mt = this.mockTestRepo.create(body);
    return this.mockTestRepo.save(mt);
  }

  @Patch('mock-tests/:id')
  async updateMockTest(@Request() req, @Param('id') id: string, @Body() body: any) {
    this.checkAdmin(req);
    await this.mockTestRepo.update(id, body);
    return this.mockTestRepo.findOne({ where: { id } });
  }

  @Delete('mock-tests/:id')
  async deleteMockTest(@Request() req, @Param('id') id: string) {
    this.checkAdmin(req);
    await this.mockTestRepo.delete(id);
    return { success: true };
  }

  // ── Mock Attempt manual score override ──────────────────────────────────────
  @Patch('mock-attempts/:id/score')
  async overrideAttemptScore(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { totalScore: number; sectionScores?: any },
  ) {
    this.checkAdmin(req);
    const attempt = await this.mockAttemptRepo.findOne({ where: { id } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    attempt.totalScore = body.totalScore;
    if (body.sectionScores) {
      attempt.sectionScores = body.sectionScores;
    }
    await this.mockAttemptRepo.save(attempt);
    return attempt;
  }
}
