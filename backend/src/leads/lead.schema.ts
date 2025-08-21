import { Schema } from 'mongoose';

export const LeadSchema = new Schema({
  siteKey: { type: String, required: true, index: true },
  name: String,
  email: String,
  message: String,
  source: String, // e.g., "low-confidence" or "manual"
  meta: Object,
  createdAt: { type: Date, default: Date.now }
});
