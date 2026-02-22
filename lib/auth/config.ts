import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import Credentials from 'next-auth/providers/credentials';
import Github from 'next-auth/providers/github';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' }, // Force JWT for credentials/database hybrid
  providers: [
    Github({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
    }),
    Credentials({
      name: 'Password',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const validPassword = process.env.AUTH_PASSWORD;
        if (!validPassword) return null;

        if (credentials.password === validPassword) {
            return { id: '1', name: 'Admin', email: 'admin@local' };
        }
        return null;
      },
    }),
  ],
});
