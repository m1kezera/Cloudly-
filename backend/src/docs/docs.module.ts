import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocsService } from './docs.service';
import { DocsController } from './docs.controller';
import { DocChunkSchema } from './doc-chunk.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'DocChunk', schema: DocChunkSchema }]),
  ],
  controllers: [DocsController],
  providers: [DocsService],
})
export class DocsModule {}
