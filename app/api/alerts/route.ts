import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(): Promise<Response> {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const alerts = await prisma.notification.findMany({
            orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
            take: 100
        });

        return NextResponse.json({ alerts });
    } catch (error) {
        console.error('Failed to fetch alerts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
