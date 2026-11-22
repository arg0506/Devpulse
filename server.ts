import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer as createHTTPServer } from 'http';
import path from 'path';
import { initSockets } from './backend/sockets';
import { db } from './backend/db';
import authRouter from './backend/routes/auth';
import communitiesRouter from './backend/routes/communities';
import eventsRouter from './backend/routes/events';
import paymentsRouter from './backend/routes/payments';
import agentsRouter from './backend/routes/agents';
import { checkPrismaConnection, isPrismaEnabled } from './backend/prismaClient';
import { authMiddleware, AuthenticatedRequest } from './backend/middleware/auth';
import { rateLimit } from './backend/middleware/rateLimit';
import { buildPresenceList } from './backend/realtime';
import { isGeminiReady } from './backend/gemini';

async function startServer() {
  await checkPrismaConnection();

  const app = express();
  const server = createHTTPServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  // Baseline browser protections for every response.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=()');
    next();
  });
  if (process.env.FRONTEND_URL) app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Password endpoints allow 10 attempts per IP every 15 minutes.
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }, 'Too many attempts. Wait a few minutes and try again.');
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/communities', communitiesRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/agents', agentsRouter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      storage: isPrismaEnabled() ? 'postgres' : 'json',
      gemini: isGeminiReady(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/channels', authMiddleware, (req: AuthenticatedRequest, res) => {
    res.json(db.getChannelsForUser(req.user!.userId));
  });

  app.get('/api/channels/:channelId/messages', authMiddleware, (req: AuthenticatedRequest, res) => {
    if (!db.canAccessChannel(req.params.channelId, req.user!.userId)) {
      return res.status(403).json({ error: 'You are not part of this conversation.' });
    }
    res.json(db.getRecentMessages(req.params.channelId));
  });

  // Public profiles only: credentials live in a separate store and never leave the server.
  app.get('/api/users', authMiddleware, (_req, res) => {
    res.json(buildPresenceList());
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` });
  });

  initSockets(server);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    // Run `npm start` from the project root; Vite writes the client build to ./dist.
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Lemo] http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error launching Lemo server:', err);
  process.exit(1);
});
