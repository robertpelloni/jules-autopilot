import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

import path from 'path';

const getDbUrl = () => {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:./')) {
    return process.env.DATABASE_URL;
  }
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  return `file:${dbPath}`;
};

const libsql = createClient({
  url: getDbUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN
})

// @ts-ignore
const adapter = new PrismaLibSQL(libsql)

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;