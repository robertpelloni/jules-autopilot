export class ApiRequestError extends Error {
    public code: string;
    public requestId: string;
    public details?: Record<string, unknown> | unknown[];

    constructor(message: string, code: string, requestId: string, details?: Record<string, unknown> | unknown[]) {
        super(message);
        this.name = 'ApiRequestError';
        this.code = code;
        this.requestId = requestId;
        this.details = details;
    }
}

/**
 * A wrapper around native fetch that automatically checks res.ok
 * and parses the standard ApiErrorResponse format.
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
    });

    if (!res.ok) {
        let errorData;
        try {
            errorData = await res.json();
        } catch {
            // Fallback if the server didn't return JSON
            const text = await res.text();
            throw new Error(`HTTP Error ${res.status}: ${text}`);
        }

        if (errorData?.error) {
            throw new ApiRequestError(
                errorData.error.message || 'Unknown API Error',
                errorData.error.code || 'UNKNOWN_ERROR',
                errorData.error.requestId || res.headers.get('x-request-id') || 'unknown',
                errorData.error.details
            );
        } else {
            throw new Error(`HTTP Error ${res.status}: ${JSON.stringify(errorData)}`);
        }
    }

    // Handle 204 No Content
    if (res.status === 204) {
        return {} as T;
    }

    return res.json() as Promise<T>;
}
