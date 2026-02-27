'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Event types emitted by the SSE stream at /api/events/stream.
 */
export type SSEEventType =
    | 'connected'
    | 'heartbeat'
    | 'session:update'
    | 'keeper:action'
    | 'telemetry:cost'
    | 'shadow_pilot_alert';

export interface SSEEvent<T = unknown> {
    type: SSEEventType;
    data: T;
    timestamp: string;
}

interface UseEventStreamOptions {
    /** Whether to auto-connect on mount. Default: true. */
    autoConnect?: boolean;
    /** Callback for each event received. */
    onEvent?: (event: SSEEvent) => void;
    /** Callback on connection error. */
    onError?: (error: Event) => void;
    /** Auto-reconnect delay in ms. Default: 3000. */
    reconnectDelay?: number;
}

interface UseEventStreamReturn {
    /** Whether the stream is currently connected. */
    isConnected: boolean;
    /** Most recent events (capped at 50). */
    events: SSEEvent[];
    /** Manually connect to the stream. */
    connect: () => void;
    /** Manually disconnect from the stream. */
    disconnect: () => void;
}

/**
 * useEventStream
 *
 * React hook for consuming the Server-Sent Events stream from /api/events/stream.
 * Provides auto-reconnect, event buffering, and connection state management.
 *
 * @example
 * ```tsx
 * const { isConnected, events } = useEventStream({
 *   onEvent: (e) => {
 *     if (e.type === 'keeper:action') toast.info(e.data.message);
 *   },
 * });
 * ```
 */
export function useEventStream(options: UseEventStreamOptions = {}): UseEventStreamReturn {
    const {
        autoConnect = true,
        onEvent,
        onError,
        reconnectDelay = 3000,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState<SSEEvent[]>([]);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onEventRef = useRef(onEvent);
    const onErrorRef = useRef(onError);

    // Keep refs in sync
    onEventRef.current = onEvent;
    onErrorRef.current = onError;

    const addEvent = useCallback((event: SSEEvent) => {
        setEvents((prev) => {
            const next = [event, ...prev];
            return next.length > 50 ? next.slice(0, 50) : next;
        });
        onEventRef.current?.(event);
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const connect = useCallback(() => {
        // Clean up any existing connection
        disconnect();

        const eventSource = new EventSource('/api/events/stream');
        eventSourceRef.current = eventSource;

        // Handle named event types
        const eventTypes: SSEEventType[] = ['connected', 'heartbeat', 'session:update', 'keeper:action', 'telemetry:cost'];
        eventTypes.forEach((type) => {
            eventSource.addEventListener(type, (e) => {
                try {
                    const data = JSON.parse((e as MessageEvent).data);
                    addEvent({
                        type,
                        data,
                        timestamp: data.timestamp || new Date().toISOString(),
                    });

                    if (type === 'connected') {
                        setIsConnected(true);
                    }
                } catch {
                    // Malformed JSON — ignore
                }
            });
        });

        eventSource.onerror = (e) => {
            setIsConnected(false);
            onErrorRef.current?.(e);

            // Auto-reconnect
            eventSource.close();
            eventSourceRef.current = null;
            reconnectTimerRef.current = setTimeout(() => {
                connect();
            }, reconnectDelay);
        };
    }, [disconnect, addEvent, reconnectDelay]);

    useEffect(() => {
        if (autoConnect) {
            connect();
        }
        return () => {
            disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { isConnected, events, connect, disconnect };
}
