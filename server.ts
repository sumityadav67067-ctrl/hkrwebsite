import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { bootstrapAdminFromEnvIfConfigured } from './backend/auth.ts';
import { initDatabase } from './backend/db.ts';
import { createApiRouter, registerSeoRoutes } from './backend/routes.ts';
import { startBackgroundWorkers } from './backend/syncWorker.ts';

function resolveValidatedPort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw.trim() === '') {
    return 3000;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    console.error(`[ERROR] Invalid PORT configuration: "${raw}". Port must be an integer between 1 and 65535.`);
    process.exit(1);
  }
  return parsed;
}

async function startServer() {
  const port = resolveValidatedPort();
  const host = (process.env.HOST || '0.0.0.0').trim();
  const isProd = process.env.NODE_ENV === 'production';

  initDatabase();
  bootstrapAdminFromEnvIfConfigured();

  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  registerSeoRoutes(app);
  app.use('/api', createApiRouter());

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(
      express.static(distDir, {
        maxAge: '1h',
        index: false,
      })
    );
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error('================================');
      console.error('PORT CONFLICT DETECTED (EADDRINUSE)');
      console.error('================================');
      console.error(`Port ${port} is already in use by another process.`);
      console.error(`Configured HOST: ${host}`);
      console.error(`Action: Stop the conflicting process or change PORT in your .env file.`);
      console.error('================================');
      process.exit(1);
    }
    if (err.code === 'EACCES') {
      console.error(`[ERROR] Permission denied binding to port ${port}. Use a port >= 1024 or elevated privileges.`);
      process.exit(1);
    }
    console.error('[ERROR] Server startup failed:', err.message);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log('================================');
    console.log('CREATOR WEBSITE STARTED');
    console.log('================================');
    console.log(`Website: http://localhost:${port}`);
    console.log('Status: RUNNING');
    console.log(`Port: ${port}`);
    console.log('================================');
    startBackgroundWorkers();
  });
}

startServer().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});
