import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';

type LeadDoc = {
  _id: string;
  siteKey: string;
  name?: string;
  email?: string;
  message?: string;
  source?: string;
  meta?: Record<string, any>;
  createdAt: Date;
};

type CreateLeadDto = {
  name?: string;
  email?: string;
  message?: string;
  source?: string;
  meta?: Record<string, any>;
};

@Injectable()
export class LeadsService {
  constructor(@InjectModel('Lead') private leadModel: Model<LeadDoc>) {}

  async create(siteKey: string, body: CreateLeadDto) {
    const doc: Partial<LeadDoc> = {
      siteKey,
      name: body.name?.trim(),
      email: body.email?.trim(),
      message: body.message?.trim(),
      source: body.source || 'widget',
      meta: body.meta || {},
      createdAt: new Date(),
    };
    const created = await this.leadModel.create(doc);
    return { ok: true, id: created._id };
  }

  async list(siteKey: string, page = 1, limit = 25) {
    const filter: FilterQuery<LeadDoc> = { siteKey };
    const total = await this.leadModel.countDocuments(filter);
    const items = await this.leadModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      page,
      limit,
      total,
      items,
    };
  }

  async exportCsv(siteKey: string) {
    const items = await this.leadModel
      .find({ siteKey })
      .sort({ createdAt: -1 })
      .lean();

    // build CSV manually (no extra deps)
    const header = ['_id', 'name', 'email', 'message', 'source', 'createdAt'];
    const rows = [header.join(',')];

    for (const l of items) {
      // escape commas/quotes/newlines
      const esc = (v: any) => {
        const s = (v ?? '').toString();
        if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      rows.push(
        [
          esc(l._id),
          esc(l.name),
          esc(l.email),
          esc(l.message),
          esc(l.source),
          esc(l.createdAt?.toISOString()),
        ].join(','),
      );
    }

    return rows.join('\n');
  }
}
