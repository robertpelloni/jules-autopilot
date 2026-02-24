import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTransferSchema } from '@/lib/schemas/transfers';
import { z } from 'zod';

export async function GET() {
    try {
        const transfers = await prisma.sessionTransfer.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return NextResponse.json(transfers);
    } catch (error) {
        console.error('[TRANSFERS_GET]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const json = await req.json();
        const body = createTransferSchema.parse(json);

        const transfer = await prisma.sessionTransfer.create({
            data: {
                sourceProvider: body.sourceProvider,
                sourceSessionId: body.sourceSessionId,
                targetProvider: body.targetProvider,
                status: 'queued',
                transferredItems: JSON.stringify({ activities: 0, files: 0 }),
            },
        });

        return NextResponse.json(transfer);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 });
        }

        console.error('[TRANSFERS_POST]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}
