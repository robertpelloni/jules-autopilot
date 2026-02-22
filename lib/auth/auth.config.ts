import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  providers: [], // Configured in auth.ts to avoid Node deps here if needed
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname === '/';

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      } else if (isLoggedIn) {
        // Redirect logged-in users away from login page
        if (nextUrl.pathname === '/login') {
            return Response.redirect(new URL('/dashboard', nextUrl));
        }
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
