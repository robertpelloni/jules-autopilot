/**
 * Jules Autopilot Main Entry
 * Build: 2026-03-24T22:13:47Z
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';

console.log("[Main] Starting React bootstrap...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("[Main] Root element #root not found!");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
    console.log("[Main] React render initiated.");
  } catch (err) {
    console.error("[Main] Fatal React crash during bootstrap:", err);
    rootElement.innerHTML = `
      <div style="color: white; padding: 20px; font-family: monospace;">
        <h1 style="color: #ef4444;">FATAL CRASH</h1>
        <pre>${err instanceof Error ? err.stack : String(err)}</pre>
      </div>
    `;
  }
}

// Global error handler for uncaught script errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error("[Global Error]", { message, source, lineno, colno, error });
  if (rootElement) {
    rootElement.innerHTML += `
      <div style="color: #fca5a5; padding: 10px; border: 1px solid #ef4444; margin-top: 10px; font-family: monospace;">
        <strong>Uncaught Error:</strong> ${message}
      </div>
    `;
  }
};
