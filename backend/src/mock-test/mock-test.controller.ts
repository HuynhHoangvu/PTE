import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MockTestService } from './mock-test.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Mock Tests')
@Controller('mock-tests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MockTestController {
  constructor(private mockTestService: MockTestService) {}

  @Get()
  findAll() { return this.mockTestService.findAll(); }

  @Get('history')
  getUserHistory(@Request() req) {
    return this.mockTestService.getUserHistory(req.user.userId);
  }

  @Get('attempts/:attemptId')
  getAttempt(@Param('attemptId') attemptId: string, @Request() req) {
    return this.mockTestService.getAttemptById(attemptId, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.mockTestService.findOne(id); }

  @Post(':id/start')
  startAttempt(@Param('id') id: string, @Request() req) {
    return this.mockTestService.startAttempt(req.user.userId, id);
  }

  @Patch('attempts/:attemptId/progress')
  saveProgress(
    @Param('attemptId') attemptId: string,
    @Request() req,
    @Body() body: { answers?: any; currentQuestionIndex?: number; timeRemainingSeconds?: number },
  ) {
    return this.mockTestService.saveProgress(attemptId, req.user.userId, body);
  }

  @Post('attempts/:attemptId/submit')
  submitAttempt(@Param('attemptId') attemptId: string, @Request() req) {
    return this.mockTestService.submitAttempt(attemptId, req.user.userId);
  }
}
