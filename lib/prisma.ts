import type { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

import path from 'path';

const getDbUrl = () => {
  let url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      url = 'file:/tmp/dev.db';
    } else {
      url = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
    }
  }

  // Optimize SQLite connection pooling for Docker concurrency
  if (url.startsWith('file:') && !url.includes('connection_limit')) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}connection_limit=1&socket_timeout=10`;
  }
  return url;
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
