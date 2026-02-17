const DEFAULT_DAEMON_HTTP_BASE_URL = 'http://localhost:8080';

export const DAEMON_HTTP_BASE_URL =
  process.env.NEXT_PUBLIC_DAEMON_HTTP_URL || DEFAULT_DAEMON_HTTP_BASE_URL;

function deriveWebSocketUrl(httpUrl: string): string {
  if (httpUrl.startsWith('https://')) {
    return httpUrl.replace('https://', 'wss://') + '/ws';
  }
  if (httpUrl.startsWith('http://')) {
    return httpUrl.replace('http://', 'ws://') + '/ws';
  }
  return 'ws://localhost:8080/ws';
}

export const DAEMON_WS_URL =
  process.env.NEXT_PUBLIC_DAEMON_WS_URL || deriveWebSocketUrl(DAEMON_HTTP_BASE_URL);