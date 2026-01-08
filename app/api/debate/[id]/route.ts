import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      return NextResponse.json(
        { error: 'Debate not found' },
        { status: 404 }
      );
    }

    const formattedDebate = {
      ...debate,
      rounds: typeof debate.rounds === 'string' ? JSON.parse(debate.rounds) : debate.rounds,
      history: typeof debate.history === 'string' ? JSON.parse(debate.history) : debate.history,
      metadata: debate.metadata && typeof debate.metadata === 'string' ? JSON.parse(debate.metadata) : debate.metadata,
    };

    return NextResponse.json(formattedDebate);
  } catch (error) {
    console.error('Failed to fetch debate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debate' },
      { status: 500 }
    );
  }
}
