import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import Credentials from 'next-auth/providers/credentials';
import Github from 'next-auth/providers/github';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
        // Simple single-user password check for self-hosting
        // In a real app, hash this or check DB.
        const validPassword = process.env.AUTH_PASSWORD;
        if (!validPassword) {
            return null; // Auth disabled or misconfigured
        }

        if (credentials.password === validPassword) {
            return { id: '1', name: 'Admin', email: 'admin@local' };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
      async session({ session, user }) {
          return session;
      }
  }
});
