import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AskService } from './ask.service';
import { AskController } from './ask.controller';
import { DocChunkSchema } from '../docs/doc-chunk.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'DocChunk', schema: DocChunkSchema }]),
  ],
  controllers: [AskController],
  providers: [AskService],
})
export class AskModule {}
