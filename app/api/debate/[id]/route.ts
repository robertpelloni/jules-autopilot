import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, handleInternalError } from '@/lib/api/error';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const debate = await prisma.debate.findUnique({
      where: { id },
    });

    if (!debate) {
      return createErrorResponse(req, 'NOT_FOUND', 'Debate not found', 404);
    }

    const formattedDebate = {
      ...debate,
      rounds: typeof debate.rounds === 'string' ? JSON.parse(debate.rounds) : debate.rounds,
      history: typeof debate.history === 'string' ? JSON.parse(debate.history) : debate.history,
      metadata: debate.metadata && typeof debate.metadata === 'string' ? JSON.parse(debate.metadata) : debate.metadata,
    };

    return NextResponse.json(formattedDebate);
  } catch (error) {
    return handleInternalError(req, error);
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    await prisma.debate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleInternalError(req, error);
  }
}
