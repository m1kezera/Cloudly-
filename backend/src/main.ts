import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';
import * as fs from 'fs';

function parseOrigins(csv?: string): (string | RegExp)[] {
  const arr = (csv || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  // fallback: libera Vercel e localhost
  return arr.length ? arr : [/\.vercel\.app$/, /^https?:\/\/localhost(:\d+)?$/];
}

async function bootstrap() {
  // vamos controlar o CORS manualmente
  const app = await NestFactory.create(AppModule, { cors: false });
  const logger = new Logger('Bootstrap');

  const publicDir = join(__dirname, '..', 'public');
  const expressApp: express.Express = app.getHttpAdapter().getInstance();

  // 1) CORS via ENV (CORS_ORIGINS separado por vírgula)
  app.enableCors({
    origin: parseOrigins(process.env.CORS_ORIGINS),
    credentials: true,
  });

  // 2) Sirva /cloudly/ como estático (landing + assets) ANTES do restante
  expressApp.use(
    '/cloudly',
    express.static(join(publicDir, 'cloudly'), { fallthrough: false })
  );

  // 3) Demais arquivos estáticos (build do widget na raiz de /public)
  expressApp.use(express.static(publicDir));

  // 4) Middleware de SITE_KEY para proteger as rotas da API
  //    (não exige para estáticos, OPTIONS e /health)
  const REQUIRE_SITE_KEY = !!process.env.SITE_KEY;
  app.use((req: any, res: any, next: any) => {
    if (!REQUIRE_SITE_KEY) return next();
    if (req.method === 'OPTIONS') return next();

    const path: string = req.path || req.url || '';

    // liberar health e estáticos
    if (
      path.startsWith('/health') ||
      path.startsWith('/cloudly') ||
      path.startsWith('/public') ||
      path.match(/\.(js|css|map|png|jpg|jpeg|webp|svg|ico|txt|json)$/)
    ) {
      return next();
    }

    const got =
      (req.headers['x-site-key'] as string) ||
      (req.query?.siteKey as string) ||
      '';

    if (got === process.env.SITE_KEY) return next();
    return res.status(401).json({ error: 'invalid site key' });
  });

  // 5) Fallback SPA SOMENTE quando não for /api nem /cloudly
  expressApp.get(/^\/(?!api(?:\/|$)|cloudly(?:\/|$)).*/, (req, res, next) => {
    const p = req.path;
    // se pediram um arquivo com extensão, tenta servir
    if (p.includes('.')) {
      const filePath = join(publicDir, p);
      if (fs.existsSync(filePath)) return res.sendFile(filePath);
      return next(); // deixa static responder 404
    }
    // caso contrário, entrega o SPA (index.html)
    return res.sendFile(join(publicDir, 'index.html'));
  });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on http://0.0.0.0:${port}`);
}

bootstrap();
