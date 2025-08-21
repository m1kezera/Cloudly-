import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const publicDir = join(__dirname, '..', 'public');
  const expressApp: express.Express = app.getHttpAdapter().getInstance();

  // Libera CORS (útil pro trycloudflare)
  app.enableCors({ origin: true, credentials: true });

  // 1) Sirva /cloudly/ como estático (landing + assets) ANTES do restante
  expressApp.use(
    '/cloudly',
    express.static(join(publicDir, 'cloudly'), { fallthrough: false })
  );

  // 2) Demais arquivos estáticos (build do widget fica na raiz de /public)
  expressApp.use(express.static(publicDir));

  // 3) Fallback SPA SOMENTE quando não for /api nem /cloudly
  //    (Regex simples pra não acionar path-to-regexp com parâmetro)
  expressApp.get(/^\/(?!api(?:\/|$)|cloudly(?:\/|$)).*/, (req, res, next) => {
    const p = req.path;

    // Se pediram um arquivo com extensão (ex.: /foo/app.js), tenta servir se existir
    if (p.includes('.')) {
      const filePath = join(publicDir, p);
      if (fs.existsSync(filePath)) return res.sendFile(filePath);
      return next(); // deixa static responder 404
    }

    // Caso contrário, entrega o SPA do widget (index.html na raiz de /public)
    return res.sendFile(join(publicDir, 'index.html'));
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Server running on port ${port}`);
}

bootstrap();
