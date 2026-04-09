import type { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

import path from 'path';

const getDbUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // In Vercel (or production), fallback to a temp file to avoid "Access to storage not allowed"
  // caused by trying to write to read-only ./prisma/dev.db
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return 'file:/tmp/dev.db';
  }

  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  return `file:${dbPath}`;
};

const url = getDbUrl();
const isRemote = url.startsWith('libsql://') || url.startsWith('https://') || url.startsWith('wss://');

let adapter;

if (isRemote) {
  // Use require for dynamic import to prevent bundling issues on Vercel
  // when falling back to SQLite
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSQL } = require('@prisma/adapter-libsql');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@libsql/client');

  const libsql = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  adapter = new PrismaLibSQL(libsql);
}

let prismaClient: PrismaClient;

try {
  // Use dynamic require for PrismaClient to prevent module load failures
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client');

  prismaClient = globalForPrisma.prisma || (adapter
    ? new PrismaClient({ adapter })
    : new PrismaClient({
        datasources: {
          db: {
            url: url
          }
        }
      }));
} catch (e) {
  console.error('Failed to initialize Prisma Client:', e);
  // Return a proxy that throws on any access to prevent crash loop but allow module load
  prismaClient = new Proxy({} as PrismaClient, {
    get: (_, prop) => {
      if (prop === 'then') return undefined; // Promise safety
      return () => {
        throw new Error('Database initialization failed. Check server logs.');
      };
    }
  });
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
