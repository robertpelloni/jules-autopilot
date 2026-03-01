import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/personas — List all agent personas
 * POST /api/personas — Create a new persona
 * DELETE /api/personas — Delete a persona
 */
export async function GET(): Promise<Response> {
    const personas = await prisma.agentPersona.findMany({
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ personas });
}

export async function POST(req: Request): Promise<Response> {
    const body = await req.json() as {
        name?: string;
        description?: string;
        systemPrompt?: string;
        temperature?: number;
        allowedTools?: string[];
        isDefault?: boolean;
    };

    if (!body.name || !body.description || !body.systemPrompt) {
        return NextResponse.json({ error: 'Missing required fields: name, description, systemPrompt' }, { status: 400 });
    }

    // If this is set as default, unset others
    if (body.isDefault) {
        await prisma.agentPersona.updateMany({
            where: { isDefault: true },
            data: { isDefault: false }
        });
    }

    const persona = await prisma.agentPersona.create({
        data: {
            name: body.name,
            description: body.description,
            systemPrompt: body.systemPrompt,
            temperature: body.temperature || 0.7,
            allowedTools: JSON.stringify(body.allowedTools || ['*']),
            isDefault: body.isDefault || false
        }
    });

    return NextResponse.json({ persona }, { status: 201 });
}

export async function DELETE(req: Request): Promise<Response> {
    const body = await req.json() as { id?: string };

    if (!body.id) {
        return NextResponse.json({ error: 'Missing persona id' }, { status: 400 });
    }

    const persona = await prisma.agentPersona.findUnique({ where: { id: body.id } });
    if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (persona.isDefault) {
        return NextResponse.json({ error: 'Cannot delete the default persona. Set another default first.' }, { status: 400 });
    }

    await prisma.agentPersona.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true, deleted: body.id });
}
