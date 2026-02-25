import { auth } from '@/auth';
import { encrypt, decrypt } from './session-utils';
import { prisma } from '@/lib/prisma';

export { encrypt, decrypt };

/**
 * Replaces the legacy manual cookie parsing with robust Auth.js verification.
 * 
 * In this multi-tenant iteration, if a developer wants to pass a legacy Jules API key
 * explicitly, we map it into the user object metadata, but the default mode
 * relies on standard NextAuth JWT verification.
 */
export async function getSession() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  // Eagerly resolve the user's active workspace for data isolation queries
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });

  return {
    ...session,
    apiKey: session.user.id || 'authenticated-via-oauth',
    user: {
      ...session.user,
      workspaceId: membership?.workspaceId || null,
    },
    workspaceId: membership?.workspaceId || null,
  };
}

// Stubs for transitionary period where legacy code manually invokes these.
// True destruction of sessions now happens explicitly via next-auth's <form action={signOut}>.
export async function setSession(apiKey: string) {
  console.warn('Manual setSession(apiKey) invoked. This is deprecated under the Auth.js multi-tenant model.');
}

export async function clearSession() {
  console.warn('Manual clearSession() invoked. Use NextAuth signOut() instead.');
}
