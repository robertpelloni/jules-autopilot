import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleInternalError } from '@/lib/api/error';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const debate = await prisma.storedDebate.findUnique({
      where: { id },
    });

    if (!debate) {
      return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
    }

    const formattedDebate = {
      ...debate,
      rounds: typeof debate.rounds === 'string' ? JSON.parse(debate.rounds) : debate.rounds,
      history: typeof debate.history === 'string' ? JSON.parse(debate.history) : debate.history,
      metadata: debate.metadata && typeof debate.metadata === 'string' ? JSON.parse(debate.metadata) : debate.metadata,
    };

    return NextResponse.json(formattedDebate);
  } catch (error) {
    return handleInternalError(req as any, error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.storedDebate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleInternalError(req as any, error);
  }
}
