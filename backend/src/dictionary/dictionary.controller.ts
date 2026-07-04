import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DictionaryService } from './dictionary.service';

@ApiTags('Dictionary')
@Controller('dictionary')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DictionaryController {
  constructor(private dictionaryService: DictionaryService) {}

  @Get(':word')
  lookup(@Param('word') word: string) {
    return this.dictionaryService.lookup(word);
  }
}
