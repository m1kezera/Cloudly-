import { Controller, Post, Body, Headers, Query } from '@nestjs/common';
import { AskService } from './ask.service';

type AskBody = { question?: string; siteKey?: string };

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  async askQuestion(
    @Body() body: AskBody,
    @Headers('x-site-key') siteKeyHeader: string,
    @Query('siteKey') siteKeyQuery?: string,
  ) {
    const question = (body?.question ?? '').toString();
    const siteKey = siteKeyHeader || body?.siteKey || siteKeyQuery || '';
    return this.askService.answerQuestion(siteKey, question);
  }
}
