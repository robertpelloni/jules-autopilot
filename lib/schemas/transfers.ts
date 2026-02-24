import { z } from 'zod';

export const createTransferSchema = z.object({
    sourceProvider: z.string(),
    sourceSessionId: z.string(),
    targetProvider: z.string(),
});

export const updateTransferSchema = z.object({
    status: z.enum(['queued', 'preparing', 'exporting', 'importing', 'ready', 'failed']).optional(),
    targetSessionId: z.string().optional(),
    transferredItems: z.string().optional(), // Should be JSON string of { activities: number, files: number }
    errorReason: z.string().optional(),
});
