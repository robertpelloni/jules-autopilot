import { NextResponse } from 'next/server';
import { z } from 'zod';

export interface ApiErrorDetail {
    code: string;
    message: string;
    details?: Record<string, unknown> | z.ZodIssue[];
    requestId?: string;
}

export interface ApiErrorResponse {
    error: ApiErrorDetail;
}

export function createErrorResponse(
    req: Request,
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown> | z.ZodIssue[]
): NextResponse<ApiErrorResponse> {
    const requestId = req.headers.get('x-request-id') || 'unknown';

    const response: ApiErrorResponse = {
        error: {
            code,
            message,
            requestId,
            ...(details && { details }),
        },
    };

    // Structured logging for the backend
    console.error(`[RequestId: ${requestId}] [${code}] ${message}`, details ? JSON.stringify(details) : '');

    return NextResponse.json(response, { status: statusCode });
}

export function handleZodError(req: Request, error: z.ZodError): NextResponse<ApiErrorResponse> {
    return createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid request payload', 422, error.issues);
}

export function handleInternalError(req: Request, error: unknown): NextResponse<ApiErrorResponse> {
    const message = error instanceof Error ? error.message : 'Unknown internal error';
    return createErrorResponse(req, 'INTERNAL_ERROR', message, 500);
}
