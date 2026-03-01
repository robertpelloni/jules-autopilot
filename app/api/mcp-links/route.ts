import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit, AuditActions } from '@/lib/audit';

/**
 * GET /api/mcp-links — List all federated MCP connections
 * POST /api/mcp-links — Create a new MCP link
 * PATCH /api/mcp-links — Toggle active status or update connection state
 * DELETE /api/mcp-links — Remove an MCP link
 */
export async function GET(): Promise<Response> {
    const links = await prisma.mcpServerLink.findMany({
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ links });
}

export async function POST(req: Request): Promise<Response> {
    const body = await req.json() as {
        name?: string;
        url?: string;
        command?: string;
        args?: string[];
        env?: Record<string, string>;
    };

    if (!body.name) {
        return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    if (!body.url && !body.command) {
        return NextResponse.json({ error: 'Must provide either url (for HTTP/SSE) or command (for stdio)' }, { status: 400 });
    }

    const link = await prisma.mcpServerLink.create({
        data: {
            name: body.name,
            url: body.url || null,
            command: body.command || null,
            args: body.args ? JSON.stringify(body.args) : null,
            env: body.env ? JSON.stringify(body.env) : null,
            status: 'disconnected'
        }
    });

    await audit({
        actor: 'user',
        action: 'mcp_link.created',
        resource: 'mcp_link',
        resourceId: link.id,
        metadata: { name: link.name, type: body.url ? 'sse' : 'stdio' }
    });

    return NextResponse.json({ link }, { status: 201 });
}

export async function PATCH(req: Request): Promise<Response> {
    const body = await req.json() as { id?: string; isActive?: boolean; status?: string; errorMsg?: string };

    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.status !== undefined) data.status = body.status;
    if (body.errorMsg !== undefined) data.errorMsg = body.errorMsg;

    const link = await prisma.mcpServerLink.update({
        where: { id: body.id },
        data
    });

    return NextResponse.json({ link });
}

export async function DELETE(req: Request): Promise<Response> {
    const body = await req.json() as { id?: string };

    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await prisma.mcpServerLink.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true, deleted: body.id });
}
