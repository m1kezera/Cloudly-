import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  Res,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import type { Response } from 'express'; // <- type-only import fixes TS1272

type CreateLeadDto = {
  name?: string;
  email?: string;
  message?: string;
  source?: string; // e.g. "low-confidence", "cta"
  meta?: Record<string, any>;
};

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // Public from widget, but we still require siteKey to associate the lead
  @Post()
  async createLead(
    @Body() body: CreateLeadDto,
    @Headers('x-site-key') siteKey: string,
  ) {
    if (!siteKey) return { error: 'Missing x-site-key header' };
    return this.leadsService.create(siteKey, body);
  }

  // Admin list (call from dashboard with siteKey)
  @Get()
  async listLeads(
    @Headers('x-site-key') siteKey: string,
    @Query('page') page = '1',
    @Query('limit') limit = '25',
  ) {
    if (!siteKey) return { error: 'Missing x-site-key header' };
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    return this.leadsService.list(siteKey, p, l);
  }

  // CSV export for admin
  @Get('export')
  async exportCsv(
    @Headers('x-site-key') siteKey: string,
    @Res() res: Response,
  ) {
    if (!siteKey) {
      return res.status(400).json({ error: 'Missing x-site-key header' });
    }
    const csv = await this.leadsService.exportCsv(siteKey);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="leads_export.csv"',
    );
    return res.send(csv);
  }
}
