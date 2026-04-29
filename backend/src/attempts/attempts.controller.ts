import {
  Controller, Post, Get, Param, Body, Query,
  UseGuards, Request, UploadedFile, UseInterceptors,
  StreamableFile, Response, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Attempts')
@Controller('attempts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttemptsController {
  constructor(private attemptsService: AttemptsService) {}

  // Submit speaking attempt with audio file
  @Post('speaking')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  async submitSpeaking(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { questionId: string; duration?: number },
  ) {
    return this.attemptsService.submitSpeaking({
      userId: req.user.userId,
      questionId: body.questionId,
      audioBuffer: file?.buffer,
      duration: body.duration ? Number(body.duration) : undefined,
    });
  }

  // Submit text/MC/FIB attempt
  @Post('text')
  async submitText(
    @Request() req,
    @Body() body: {
      questionId: string;
      textAnswer?: string;
      selectedAnswers?: any;
      duration?: number;
    },
  ) {
    return this.attemptsService.submitText({
      userId: req.user.userId,
      ...body,
    });
  }

  // Poll for score result
  @Get(':id/score')
  pollScore(@Param('id') id: string) {
    return this.attemptsService.pollScore(id);
  }

  // Get attempts for a specific question
  @Get('question/:questionId')
  getByQuestion(@Param('questionId') questionId: string, @Request() req) {
    return this.attemptsService.getAttemptsByQuestion(questionId, req.user.userId);
  }

  @Get(':id')
  getAttempt(@Param('id') id: string) {
    return this.attemptsService.getAttempt(id);
  }

  // Get audio data from database
  @Get(':id/audio')
  async getAudio(@Param('id') id: string, @Response() res) {
    const audioData = await this.attemptsService.getAttemptAudio(id);
    if (!audioData) {
      throw new NotFoundException('Audio not found');
    }
    res.type('audio/webm');
    res.send(audioData);
  }
}
