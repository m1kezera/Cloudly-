import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SitesService } from './sites.service';
import { SiteSchema } from './site.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Site', schema: SiteSchema }]),
  ],
  providers: [SitesService],
  exports: [SitesService], // needed if other modules use SitesService
})
export class SitesModule {}
