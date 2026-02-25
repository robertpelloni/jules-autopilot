import NextAuth, { NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GitHubProvider from 'next-auth/providers/github';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export const authOptions: NextAuthConfig = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.sub!;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        },
    },
    events: {
        // When a newly onboarded user registers, auto-generate their "Personal Workspace"
        async createUser({ user }) {
            if (!user.id) return;
            const slug = `personal-${nanoid(6)}`;
            await prisma.workspace.create({
                data: {
                    name: `${user.name || 'User'}'s Workspace`,
                    slug,
                    members: {
                        create: {
                            userId: user.id,
                            role: 'owner',
                        },
                    },
                },
            });
            console.log(`[NextAuth] Auto-provisioned personal workspace for ${user.email}`);
        },
    },
    pages: {
        signIn: '/login', // Bind to our custom login page
    },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
