import {
  Controller, Post, Get, Patch, Param, Body,
  UseGuards, Request, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { User, UserPlan, UserRole } from '../users/user.entity';

const PLANS = [
  { name: '20 ngày',  durationDays: 20,  amountVnd: 249000  },
  { name: '150 ngày', durationDays: 150, amountVnd: 1249000 },
  { name: '300 ngày', durationDays: 300, amountVnd: 2499000 },
];

function buildTransferContent(fullName: string, days: number): string {
  // Format: "FLY FIRSTNAME XDAY", max ~25 chars for bank transfer
  const firstName = fullName.trim().split(' ').pop()?.toUpperCase() || 'USER';
  const code = `FLY ${firstName} ${days}N`;
  return code.substring(0, 25);
}

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @Post('create')
  async createPayment(@Request() req, @Body() body: { planIndex: number }) {
    const plan = PLANS[body.planIndex];
    if (!plan) throw new NotFoundException('Invalid plan');

    const user = await this.userRepo.findOne({ where: { id: req.user.userId } });
    if (!user) throw new NotFoundException('User not found');

    const transferContent = buildTransferContent(user.fullName, plan.durationDays);

    const payment = this.paymentRepo.create({
      userId: user.id,
      planName: plan.name,
      durationDays: plan.durationDays,
      amountVnd: plan.amountVnd,
      transferContent,
    });
    await this.paymentRepo.save(payment);
    return payment;
  }

  @Get('my')
  async getMyPayments(@Request() req) {
    return this.paymentRepo.find({
      where: { userId: req.user.userId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Admin endpoints ──────────────────────────────────────────────────────
  @Get('admin/all')
  async adminListAll(@Request() req) {
    if (req.user.role !== UserRole.ADMIN) throw new ForbiddenException('Admin only');
    return this.paymentRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  @Patch('admin/:id/verify')
  async adminVerify(@Request() req, @Param('id') id: string) {
    if (req.user.role !== UserRole.ADMIN) throw new ForbiddenException('Admin only');

    const payment = await this.paymentRepo.findOne({ where: { id }, relations: ['user'] });
    if (!payment) throw new NotFoundException('Payment not found');

    payment.status = PaymentStatus.VERIFIED;
    payment.verifiedAt = new Date();
    await this.paymentRepo.save(payment);

    // Update user plan
    const user = payment.user;
    user.plan = UserPlan.PREMIUM;
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + payment.durationDays);
    (user as any).premiumUntil = expiry;
    await this.userRepo.save(user);

    return { success: true, payment };
  }

  @Patch('admin/:id/reject')
  async adminReject(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    if (req.user.role !== UserRole.ADMIN) throw new ForbiddenException('Admin only');

    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    payment.status = PaymentStatus.REJECTED;
    if (body.note) payment.adminNote = body.note;
    await this.paymentRepo.save(payment);
    return { success: true, payment };
  }
}
