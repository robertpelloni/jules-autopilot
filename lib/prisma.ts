import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

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
  const libsql = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  // @ts-ignore
  adapter = new PrismaLibSQL(libsql);
}

const prismaConfig = adapter ? { adapter } : {
  datasources: {
    db: {
      url: url
    }
  }
};

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaConfig);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;