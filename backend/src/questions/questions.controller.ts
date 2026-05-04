import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionsService, QuestionListQuery } from './questions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuestionSkill, QuestionType } from './question.entity';

@ApiTags('Questions')
@Controller('questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  findAll(@Query() query: QuestionListQuery, @Request() req) {
    const userId = req.user?.userId || null; 
    return this.questionsService.findAll(query, userId);
  }

  // Must be before :id to avoid conflict
  @Get('by-ids')
  findByIds(@Query('ids') ids: string) {
    const idList = ids ? ids.split(',').filter(Boolean) : [];
    return this.questionsService.findByIds(idList);
  }

  @Get('skill/:skill/progress')
  getSkillProgress(@Param('skill') skill: QuestionSkill, @Request() req) {
    return this.questionsService.getSkillProgress(skill, req.user.userId);
  }

  /** Random question for practice — same filters as list (?type= / ?skill=) */
  @Get('random')
  findRandom(@Query() query: Pick<QuestionListQuery, 'skill' | 'type' | 'level'>, @Request() req) {
    return this.questionsService.findRandom(query, req.user?.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Get(':code/adjacent')
  getAdjacent(
    @Param('code') code: string,
    @Query('direction') direction: 'prev' | 'next',
    @Query('type') type: QuestionType,
  ) {
    return this.questionsService.getAdjacentQuestion(code, direction, type);
  }

  @Post()
  create(@Body() dto: any) {
    return this.questionsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.questionsService.delete(id);
  }
}
