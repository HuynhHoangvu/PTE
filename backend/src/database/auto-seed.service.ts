import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserPlan, UserRole } from '../users/user.entity';

@Injectable()
export class AutoSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AutoSeedService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    try {
      const email = 'admin@flyedu.com';
      const existing = await this.userRepo.findOne({ where: { email } });
      if (existing) {
        // Ensure existing admin has the admin role
        if (existing.role !== UserRole.ADMIN) {
          existing.role = UserRole.ADMIN;
          await this.userRepo.save(existing);
          this.logger.log('Admin role updated for existing account');
        } else {
          this.logger.log('Admin account already exists, skipped');
        }
        return;
      }
      const hashed = await bcrypt.hash('Fly2026$$', 10);
      await this.userRepo.save(this.userRepo.create({
        email,
        fullName: 'Admin',
        password: hashed,
        plan: UserPlan.PREMIUM,
        role: UserRole.ADMIN,
      }));
      this.logger.log('Admin account created: admin@flyedu.com / Fly2026$$');
    } catch (err) {
      this.logger.error('Auto-seed failed:', err.message);
    }
  }
}
