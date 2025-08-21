import { Schema } from 'mongoose';

export const SiteSchema = new Schema({
  siteKey: { type: String, required: true, unique: true, index: true },
  name: String,
  plan: { type: String, default: 'free' },
  monthlyQuota: { type: Number, default: 500 },
  usage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
