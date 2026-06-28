import express from 'express';
import cors from 'cors';
import { prisma, isPrismaEnabled } from './prismaClient';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Setup CORS with flexible origins for development and production
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// API Health Check
app.get('/api/health', async (req, res) => {
  if (!isPrismaEnabled()) {
    return res.status(200).json({
      status: 'healthy',
      database: 'disconnected (JSON storage active)',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
  try {
    // Attempt a simple raw query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error: any) {
    console.error('Database connection failed in health check:', error);
    res.status(500).json({
      status: 'degraded',
      database: 'disconnected',
      error: error.message || 'Unknown database connection error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Catch-all 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred inside the system layer',
  });
});

// Run server only when launched directly (for standalone backend tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[DevPulse Backend Server] Running on port ${PORT}`);
    if (isPrismaEnabled()) {
      console.log(`[Database Connection] Initializing connection to database...`);
      prisma.$connect()
        .then(() => console.log('[Database Connection] Connected successfully via Prisma.'))
        .catch((err) => {
          console.error('[Database Connection] Initial connection failed. Please check DATABASE_URL.');
          console.error(err.message || err);
        });
    } else {
      console.log('[Database Connection] Running in local resilient JSON storage mode.');
    }
  });
}
