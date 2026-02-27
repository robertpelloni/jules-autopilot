import NextAuth, { NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export const authOptions: NextAuthConfig = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
        }),
        CredentialsProvider({
            name: 'Local Dev (Testing Only)',
            credentials: {
                username: { label: "Username", type: "text", placeholder: "admin" },
                password: { label: "Password", type: "password", placeholder: "admin" }
            },
            async authorize(credentials) {
                // Mock user for testing when GitHub isn't configured
                if (credentials?.username === "admin" && credentials?.password === "admin") {
                    return { id: "dev-admin-id", name: "Admin", email: "admin@localhost" };
                }
                return null;
            }
        })
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
