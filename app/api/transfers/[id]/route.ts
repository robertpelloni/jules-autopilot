import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateTransferSchema } from '@/lib/schemas/transfers';
import { z } from 'zod';
import { handleInternalError, handleZodError, createErrorResponse } from '@/lib/api/error';
import { getSession } from '@/lib/session';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await params;
        const transfer = await prisma.sessionTransfer.findUnique({
            where: { id },
        });

        if (!transfer || transfer.workspaceId !== session.workspaceId) {
            return new NextResponse('Not found', { status: 404 });
        }

        return NextResponse.json(transfer);
    } catch (error) {
        console.error('[TRANSFER_GET]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await params;
        const json = await req.json();
        const body = updateTransferSchema.parse(json);

        // Security assertion before update
        const existing = await prisma.sessionTransfer.findUnique({ where: { id } });
        if (!existing || existing.workspaceId !== session.workspaceId) {
            return new NextResponse('Not found', { status: 404 });
        }

        const transfer = await prisma.sessionTransfer.update({
            where: { id },
            data: {
                status: body.status,
                targetSessionId: body.targetSessionId,
                transferredItems: body.transferredItems,
                errorReason: body.errorReason,
            },
        });

        return NextResponse.json(transfer);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 });
        }

        console.error('[TRANSFER_PATCH]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}
