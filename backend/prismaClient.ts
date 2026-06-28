import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL;
const isDbUrlValid = dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'));

// Keep connection single and reusable
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: isDbUrlValid ? dbUrl : 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'
    }
  },
  log: ['error'], // Only log critical errors
});

let prismaActive = false;
let connectionChecked = false;

export async function checkPrismaConnection(): Promise<boolean> {
  if (connectionChecked) return prismaActive;
  try {
    // Run a query with a short timeout to check if the database is active and reachable
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
    ]);
    prismaActive = true;
    console.log('[Prisma] Database connection verified successfully. SQL mode active.');
  } catch (err: any) {
    prismaActive = false;
    console.warn('[Prisma Warning] Database connection failed or is unprovisioned. Falling back to local JSON storage.');
  } finally {
    connectionChecked = true;
  }
  return prismaActive;
}

export function isPrismaEnabled(): boolean {
  return connectionChecked && prismaActive;
}

export default prisma;
