import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class DocsService {
  constructor(
    @InjectModel('DocChunk') private docChunkModel: Model<any>,
  ) {}

  async saveChunks(siteKey: string, text: string) {
    if (!siteKey) {
      return { error: 'Missing x-site-key header' };
    }
    if (!text || !text.trim()) {
      return { error: 'Missing text in request body' };
    }

    // Split text into ~500-char chunks
    const chunks = text.match(/.{1,500}(\s|$)/g) || [];

    const docs = chunks.map(c => ({
      siteKey,
      chunk: c.trim(),
    }));

    await this.docChunkModel.insertMany(docs);

    return { message: 'Chunks saved', inserted: docs.length };
  }
}
