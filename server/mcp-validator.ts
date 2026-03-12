/**
 * MCP Server Validator
 * 
 * Proactively verifies that configured MCP servers are reachable.
 * Supports both HTTP (SSE) and STDIO (local process) transports.
 */

import { prisma } from '../lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface McpValidationResult {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    latencyMs: number;
    error?: string;
    capabilities?: string[];
}

/**
 * Validate a local STDIO MCP Server by checking if the command exists
 * and can be spawned.
 */
async function validateStdioServer(command: string, args: string[]): Promise<Partial<McpValidationResult>> {
    const start = Date.now();
    try {
        // Just verify the command is resolvable/executable.
        // E.g., if command is 'node', check if it exists.
        // A full handshake requires the MCP client, but we do a basic health check here.
        await execAsync(`${command === 'node' || command === 'npx' || command === 'python' ? `${command} --version` : `which ${command}`}`);
        return {
            status: 'connected',
            latencyMs: Date.now() - start,
            capabilities: ['stdio']
        };
    } catch (err) {
        return {
            status: 'error',
            latencyMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err)
        };
    }
}

/**
 * Validate a remote HTTP/SSE MCP Server.
 */
async function validateHttpServer(url: string): Promise<Partial<McpValidationResult>> {
    const start = Date.now();
    try {
        // SSE endpoints usually respond to GET, or we check a /health endpoint if customary.
        // For MCP, the SSE endpoint must be reachable.
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (!res.ok && res.status !== 405) {
            throw new Error(`HTTP ${res.status}`);
        }
        return {
            status: 'connected',
            latencyMs: Date.now() - start,
            capabilities: ['sse']
        };
    } catch (err) {
        return {
            status: 'error',
            latencyMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err)
        };
    }
}

/**
 * Validate a specific MCP Server link.
 */
export async function validateMcpLink(linkId: string): Promise<McpValidationResult> {
    const link = await prisma.mcpServerLink.findUnique({ where: { id: linkId } });
    if (!link) throw new Error('MCP Link not found');

    let result: Partial<McpValidationResult>;

    if (link.url) {
        result = await validateHttpServer(link.url);
    } else if (link.command) {
        const parsedArgs = link.args ? link.args.split(' ') : [];
        result = await validateStdioServer(link.command, parsedArgs);
    } else {
        result = { status: 'error', latencyMs: 0, error: 'Misconfigured: needs url or command' };
    }

    // Update DB status
    await prisma.mcpServerLink.update({
        where: { id: linkId },
        data: { status: result.status }
    });

    return {
        id: link.id,
        name: link.name,
        status: result.status as "connected" | "disconnected" | "error",
        latencyMs: result.latencyMs || 0,
        error: result.error,
        capabilities: result.capabilities
    };
}

/**
 * Validate all active MCP links.
 */
export async function validateAllMcpLinks(): Promise<McpValidationResult[]> {
    const links = await prisma.mcpServerLink.findMany({ where: { isActive: true } });
    const results = await Promise.all(links.map(l => validateMcpLink(l.id)));
    return results;
}
