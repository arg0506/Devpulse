import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL;
const isDbUrlValid = !!dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'));

let instance: PrismaClient | null = null;
let prismaActive = false;
let connectionChecked = false;

/**
 * Prisma is optional. The client is only constructed when DATABASE_URL points at Postgres,
 * so the app also runs on machines where `prisma generate` has not been run.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, key) {
    if (!instance) throw new Error('Prisma is not connected. Check DATABASE_URL.');
    return (instance as any)[key];
  },
});

export async function checkPrismaConnection(): Promise<boolean> {
  if (connectionChecked) return prismaActive;
  connectionChecked = true;

  if (!isDbUrlValid) {
    console.log('[db] DATABASE_URL not set. Using the local JSON store (backend-data.json).');
    return false;
  }

  try {
    instance = new PrismaClient({ datasources: { db: { url: dbUrl } }, log: ['error'] });
    await Promise.race([instance.$queryRaw`SELECT 1`, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))]);
    prismaActive = true;
    console.log('[db] PostgreSQL connected. Messages, users and events are mirrored with Prisma.');
  } catch (err: any) {
    prismaActive = false;
    instance = null;
    console.warn(`[db] Could not reach PostgreSQL (${err.message}). Falling back to the JSON store.`);
  }
  return prismaActive;
}

export function isPrismaEnabled(): boolean {
  return prismaActive;
}

export default prisma;
