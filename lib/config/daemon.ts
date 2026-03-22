// Dynamic base URLs for browser and SSR compatibility
const isBrowser = typeof window !== 'undefined';

export const DAEMON_HTTP_BASE_URL = '/api';

// WebSocket URL must be absolute in the browser
export const DAEMON_WS_URL = isBrowser 
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
  : 'ws://localhost:8080/ws';
