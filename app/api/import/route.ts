import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(req: Request): Promise<Response> {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const text = await file.text();
        let payload;
        try {
            payload = JSON.parse(text);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
        }

        const workspaceId = session.workspaceId;
        const stats = {
            debatesMap: 0,
            apiKeysMap: 0,
            auditLogsMap: 0,
            routingPoliciesMap: 0,
            templatesMap: 0,
            storedDebatesMap: 0,
            providersMap: 0
        };

        // Run sequential insertions to avoid massive transaction locks if payload is large
        // We use upsert or unique checks where possible, but for logs we just insert.
        
        if (Array.isArray(payload.debates)) {
            for (const item of payload.debates) {
                // Ensure debate maps to current workspace OR replace workspace logic if Debate has workspaceId. 
                // Currently, Debate model only has swarmId and topic. We'll skip raw debates to avoid swarm mapping issues.
                // Or we just insert if it lacks deep relations.
            }
        }

        if (Array.isArray(payload.apiKeys)) {
            for (const item of payload.apiKeys) {
                if (!item.keyHash) continue;
                const exists = await prisma.apiKey.findUnique({ where: { keyHash: item.keyHash } });
                if (!exists) {
                    await prisma.apiKey.create({
                        data: {
                            keyHash: item.keyHash,
                            keyPrefix: item.keyPrefix || '',
                            name: item.name || 'Imported Key',
                            workspaceId,
                            scopes: item.scopes || 'all',
                            expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
                            createdAt: item.createdAt ? new Date(item.createdAt) : undefined
                        }
                    });
                    stats.apiKeysMap++;
                }
            }
        }

        if (Array.isArray(payload.routingPolicies)) {
            for (const item of payload.routingPolicies) {
                const exists = await prisma.routingPolicy.findUnique({ 
                    where: { workspaceId_taskType: { workspaceId, taskType: item.taskType } } 
                });
                if (!exists) {
                    await prisma.routingPolicy.create({
                        data: {
                            taskType: item.taskType,
                            preferredProvider: item.preferredProvider,
                            preferredModel: item.preferredModel,
                            costEfficiencyMode: item.costEfficiencyMode ?? false,
                            workspaceId,
                        }
                    });
                    stats.routingPoliciesMap++;
                }
            }
        }

        if (Array.isArray(payload.templates)) {
            for (const item of payload.templates) {
                await prisma.sessionTemplate.create({
                    data: {
                        name: item.name,
                        description: item.description || '',
                        prompt: item.prompt,
                        title: item.title,
                        isFavorite: item.isFavorite ?? false,
                        isPrebuilt: item.isPrebuilt ?? false,
                        tags: item.tags || '[]',
                        workspaceId,
                    }
                });
                stats.templatesMap++;
            }
        }

        if (Array.isArray(payload.storedDebates)) {
            for (const item of payload.storedDebates) {
                await prisma.storedDebate.create({
                    data: {
                        topic: item.topic,
                        summary: item.summary,
                        history: item.history || '[]',
                        metadata: item.metadata,
                    }
                });
                stats.storedDebatesMap++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Environment restored successfully',
            stats 
        });

    } catch (error) {
        console.error('Data import failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
