import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { DocsModule } from './docs/docs.module';
import { AskModule } from './ask/ask.module';
import { LeadsModule } from './leads/leads.module';
import { SitesModule } from './sites/sites.module';

@Module({
  imports: [
    // Carrega .env automaticamente (process.env.* disponível em todo lugar)
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB por ENV (falha cedo se não tiver MONGODB_URI)
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
          throw new Error('❌ Missing MONGODB_URI in environment variables');
        }
        return {
          uri,
          dbName: process.env.DB_NAME || 'ai_faq',
        };
      },
    }),

    // Módulos da aplicação
    DocsModule,
    AskModule,
    LeadsModule,
    SitesModule,
  ],
})
export class AppModule {}
