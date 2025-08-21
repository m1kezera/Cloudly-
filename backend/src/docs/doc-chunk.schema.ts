import { Schema } from 'mongoose';

export const DocChunkSchema = new Schema({
  siteKey: { type: String, required: true, index: true },
  chunk: { type: String, required: true },
  embedding: { type: [Number], default: [] }, // optional, for future AI search
  createdAt: { type: Date, default: Date.now }
});
