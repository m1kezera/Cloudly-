import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AskService } from './ask.service';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  async askQuestion(
    @Body('question') question: string,
    @Body('siteKey') siteKeyBody: string,
    @Headers('x-site-key') siteKeyHeader: string,
  ) {
    const siteKey = siteKeyBody ?? siteKeyHeader; // body primeiro, header como fallback
    return this.askService.answerQuestion(siteKey, question);
  }
}
