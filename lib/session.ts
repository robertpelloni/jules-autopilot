import { auth } from '@/auth';
import { encrypt, decrypt } from './session-utils';
import { prisma } from '@/lib/prisma';

export { encrypt, decrypt };

/**
 * Retrieves the authenticated session with workspace context.
 * 
 * Uses NextAuth v5 JWT session verification and eagerly resolves the
 * user's active workspace membership for data isolation queries across
 * all API routes. Returns null if the user is not authenticated.
 * 
 * The returned `workspaceId` is the critical field used by every API
 * route to scope database queries to the correct workspace.
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
