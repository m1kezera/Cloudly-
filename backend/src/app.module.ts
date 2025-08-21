import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { DocsModule } from './docs/docs.module';
import { AskModule } from './ask/ask.module';
import { LeadsModule } from './leads/leads.module';
import { SitesModule } from './sites/sites.module';

const logger = new Logger('AppModule');

@Module({
  imports: [
    // .env global
    ConfigModule.forRoot({ isGlobal: true }),

    // Servir arquivos estáticos de /public (ex.: /cloudly/landing.html)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // funciona em dev e após build (dist)
      serveRoot: '/',                             // acessível direto em /
      // opcional: se você tiver rotas REST iniciando com /api, descomente a linha abaixo
      // exclude: ['/api*'],
    }),

    // MongoDB
    MongooseModule.forRoot(
      process.env.MONGODB_URI ||
        (() => {
          logger.error('❌ Missing MONGODB_URI in environment variables');
          return 'mongodb://127.0.0.1:27017'; // fallback local
        })(),
      {
        dbName: process.env.DB_NAME || 'ai_faq',
      },
    ),

    // Módulos da aplicação
    DocsModule,
    AskModule,
    LeadsModule,
    SitesModule,
  ],
})
export class AppModule {}
