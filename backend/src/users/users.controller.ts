import { Controller, Get, Patch, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body() dto: { fullName?: string; avatarUrl?: string }) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Delete('profile')
  deleteAccount(@Request() req) {
    return this.usersService.deleteAccount(req.user.userId);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.usersService.getStats(req.user.userId);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.usersService.getLeaderboard();
  }
}
