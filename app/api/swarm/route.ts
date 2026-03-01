import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/swarm — List all swarms with their tasks.
 * POST /api/swarm — Create a new swarm from a high-level prompt.
 */
export async function GET(): Promise<Response> {
    const swarms = await prisma.agentSwarm.findMany({
        include: { tasks: true },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    return NextResponse.json({ swarms });
}

export async function POST(req: Request): Promise<Response> {
    const body = await req.json() as { name?: string; prompt?: string };

    if (!body.prompt) {
        return NextResponse.json({ error: 'Missing "prompt" field' }, { status: 400 });
    }

    const name = body.name || `Swarm ${new Date().toISOString().slice(0, 16)}`;

    // Create the swarm record immediately in "pending" state
    // The actual decomposition happens asynchronously via the daemon
    const swarm = await prisma.agentSwarm.create({
        data: {
            name,
            prompt: body.prompt,
            status: 'pending'
        }
    });

    // Notify the daemon to start decomposition via HTTP
    try {
        const daemonUrl = process.env.DAEMON_URL || 'http://localhost:8080';
        await fetch(`${daemonUrl}/api/swarm/decompose`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ swarmId: swarm.id, name, prompt: body.prompt })
        });
    } catch {
        // Daemon may not be running — the swarm stays in "pending"
    }

    return NextResponse.json({ swarm }, { status: 201 });
}
