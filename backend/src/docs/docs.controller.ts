import { Controller, Post, Body, Headers } from '@nestjs/common';
import { DocsService } from './docs.service';

@Controller('docs')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Post('upload')
  async uploadDocs(
    @Body('text') text: string,
    @Headers('x-site-key') siteKey: string,
  ) {
    return this.docsService.saveChunks(siteKey, text);
  }
}
