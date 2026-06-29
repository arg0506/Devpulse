import express from 'express';
import { createServer as createHTTPServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initSockets } from './backend/sockets';
import { db } from './backend/db';
import authRouter from './backend/routes/auth';
import communitiesRouter from './backend/routes/communities';
import eventsRouter from './backend/routes/events';
import paymentsRouter from './backend/routes/payments';
import { checkPrismaConnection } from './backend/prismaClient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Check if database is reachable at startup
  await checkPrismaConnection();

  const app = express();
  const server = createHTTPServer(app);
  const PORT = 3000;

  app.use(express.json());

  // API Endpoints
  app.use('/api/auth', authRouter);
  app.use('/api/communities', communitiesRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/payments', paymentsRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/api/channels', (req, res) => {
    res.json(db.getChannels());
  });

  app.get('/api/channels/:channelId/messages', (req, res) => {
    res.json(db.getMessages(req.params.channelId));
  });

  app.get('/api/users', (req, res) => {
    res.json(db.getUsers());
  });

  // Initialize WebSockets (runs on the same port, upgrading HTTP -> WS)
  initSockets(server);

  // Dev server / Production server integration
  if (process.env.NODE_ENV !== 'production') {
    console.log('Mounting Vite dev middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production build from dist/');
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[DevPulse Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error launching DevPulse server:', err);
});
