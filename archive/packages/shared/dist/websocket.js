export function createDaemonEvent(type, data) {
    return {
        type,
        timestamp: Date.now(),
        data,
    };
}
export const WS_DEFAULTS = {
    RECONNECT_DELAY: 3000,
    MAX_RECONNECT_ATTEMPTS: 10,
    PING_INTERVAL: 30000,
};
