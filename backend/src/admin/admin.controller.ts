import {
  Controller, Get, Patch, Param, Body, UseGuards, Request,
  ForbiddenException, NotFoundException, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User, UserPlan, UserRole } from '../users/user.entity';
import { MockTestAttempt, MockTestAttemptStatus } from '../mock-test/mock-test.entity';

class UpdateUserDto {
  plan?: UserPlan;
  role?: UserRole;
  fullName?: string;
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(MockTestAttempt) private attemptRepo: Repository<MockTestAttempt>,
  ) {}

  private checkAdmin(req: any) {
    if (req.user.role !== UserRole.ADMIN) throw new ForbiddenException('Admin only');
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

    const where: any = {};
    if (search) where.email = Like(`%${search}%`);

    const [users, total] = await this.userRepo.findAndCount({
      where,
      select: ['id', 'email', 'fullName', 'plan', 'role', 'streakDays', 'totalAttempts', 'averageScore', 'createdAt', 'lastActiveAt'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    return { users, total, page: parseInt(page), limit: take };
  }

  @Get('users/:id')
  async getUser(@Request() req, @Param('id') id: string) {
    this.checkAdmin(req);
    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'plan', 'role', 'streakDays', 'totalAttempts', 'averageScore', 'createdAt', 'lastActiveAt'],
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

    await this.userRepo.save(user);
    const { password, ...rest } = user as any;
    return rest;
  }

  @Get('users/:id/mock-tests')
  async getUserMockTests(@Request() req, @Param('id') id: string) {
    this.checkAdmin(req);
    const attempts = await this.attemptRepo.find({
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
    const completedTests = await this.attemptRepo.count({ where: { status: MockTestAttemptStatus.COMPLETED } });
    return { totalUsers, premiumUsers, totalAttempts, completedTests };
  }
}
