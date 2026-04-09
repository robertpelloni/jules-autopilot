"use client";

import { useEffect, useRef, useState } from "react";
import { useJules } from "@/lib/jules/provider";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import type { Socket } from "socket.io-client";
import { AlertCircle, Terminal as TerminalIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IntegratedTerminalProps {
  sessionId: string;
  workingDir?: string;
  className?: string;
}

type TerminalStatus = 'connecting' | 'connected' | 'disconnected' | 'unavailable';

export function IntegratedTerminal({
  sessionId,
  workingDir = "",
  className = "",
}: IntegratedTerminalProps) {
  const { apiKey } = useJules();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState<TerminalStatus>('connecting');
  const [isMounted, setIsMounted] = useState(false);
  const retryCount = useRef(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!terminalRef.current || !isMounted) return;

    let terminal: Terminal;
    let fitAddon: FitAddon;
    let socket: Socket;
    let resizeObserver: ResizeObserver;
    let handleWindowResize: (() => void) | null = null;
    let isCancelled = false;

    const initTerminal = async () => {
      // Dynamic imports for browser-only libraries
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { io } = await import("socket.io-client");
      await import("@xterm/xterm/css/xterm.css");

      if (isCancelled) return;

      // Initialize xterm.js
      terminal = new Terminal({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: '"Ubuntu Mono", "Courier New", Courier, monospace',
        lineHeight: 1.2,
        theme: {
          background: "#0a0a0f",
          foreground: "#e5e5e5",
          cursor: "#ffffff",
          cursorAccent: "#0a0a0f",
          selectionBackground: "rgba(255, 255, 255, 0.2)",
          black: "#2e3436",
          red: "#cc0000",
          green: "#4e9a06",
          yellow: "#c4a000",
          blue: "#3465a4",
          magenta: "#75507b",
          cyan: "#06989a",
          white: "#d3d7cf",
          brightBlack: "#555753",
          brightRed: "#ef2929",
          brightGreen: "#8ae234",
          brightYellow: "#fce94f",
          brightBlue: "#729fcf",
          brightMagenta: "#ad7fa8",
          brightCyan: "#34e2e2",
          brightWhite: "#eeeeec",
        },
        scrollback: 1000,
        allowProposedApi: true,
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      
      if (terminalRef.current) {
        terminal.open(terminalRef.current);
        fitAddon.fit();
      }

      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Determine WebSocket URL
      const hostname = window.location.hostname;
      const isVercel = hostname.endsWith('.vercel.app');

      const wsUrl = process.env.NEXT_PUBLIC_TERMINAL_WS_URL ||
        (isVercel
          ? null // Don't even try localhost on Vercel unless explicitly configured
          : `ws://${hostname}:8081`);

      if (!wsUrl) {
         setStatus('unavailable');
         terminal.write('\r\n\x1b[33m[!] Terminal Unavailable in Serverless Environment\x1b[0m\r\n');
         return;
      }

      console.log("Connecting to terminal server:", wsUrl);

      socket = io(wsUrl, {
        query: { sessionId, workingDir, apiKey },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 5000
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        if (!isCancelled) {
          setStatus('connected');
          retryCount.current = 0;
        }
        terminal.write("\r\n\x1b[32m*** Connected to terminal ***\x1b[0m\r\n\r\n");
      });

      socket.on("connect_error", (error) => {
        if (isCancelled) return;

        retryCount.current++;
        console.warn(`Connection attempt ${retryCount.current} failed:`, error.message);

        if (retryCount.current >= 3) {
            setStatus('unavailable');
            socket.disconnect();
        } else {
            setStatus('disconnected'); // Temporary disconnect state
        }
      });

      socket.on("disconnect", () => {
        if (!isCancelled) setStatus('disconnected');
        terminal.write("\r\n\x1b[31m*** Disconnected from terminal ***\x1b[0m\r\n");
      });

      socket.on("terminal.output", (data: string) => terminal.write(data));
      socket.on("terminal.exit", ({ exitCode }: { exitCode: number }) => {
        terminal.write(`\r\n\x1b[33m*** Process exited with code ${exitCode} ***\x1b[0m\r\n`);
      });

      terminal.onData((data) => socket.emit("terminal.input", data));

      // Handle resize
      handleWindowResize = () => {
        fitAddon.fit();
        if (socket.connected) {
            socket.emit("terminal.resize", { cols: terminal.cols, rows: terminal.rows });
        }
      };
      window.addEventListener("resize", handleWindowResize);

      resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
          if (!isCancelled && fitAddon) {
            fitAddon.fit();
            if (terminal && socket.connected) {
               socket.emit("terminal.resize", { cols: terminal.cols, rows: terminal.rows });
            }
          }
        }, 0);
      });

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }
    };

    initTerminal();

    return () => {
      isCancelled = true;
      if (handleWindowResize) window.removeEventListener("resize", handleWindowResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (socketRef.current) socketRef.current.disconnect();
      if (xtermRef.current) xtermRef.current.dispose();
    };
  }, [sessionId, workingDir, isMounted, apiKey]);

  if (!isMounted) {
    return (
      <div className={`relative ${className} flex items-center justify-center bg-[#0a0a0f]`}>
        <div className="flex flex-col items-center gap-2 text-white/40 text-xs font-mono">
          <TerminalIcon className="h-4 w-4 animate-pulse" />
          <span>Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className} bg-[#0a0a0f] group`}>
      {/* Status Indicator */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
         {status === 'unavailable' && (
             <span className="flex h-2 w-2 rounded-full bg-gray-500" title="Unavailable" />
         )}
         {status === 'connected' && (
             <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Connected" />
         )}
         {status === 'disconnected' && (
             <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Disconnected" />
         )}
         {status === 'connecting' && (
             <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" title="Connecting..." />
         )}
      </div>

      {/* Terminal Container */}
      <div ref={terminalRef} className={`h-full w-full p-2 ${status === 'unavailable' ? 'opacity-20 pointer-events-none' : ''}`} />

      {/* Unavailable Overlay */}
      {status === 'unavailable' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10 mb-4">
            <AlertCircle className="h-6 w-6 text-white/60" />
          </div>
          <h3 className="text-sm font-medium text-white mb-2">Terminal Unavailable</h3>
          <p className="text-xs text-muted-foreground max-w-[280px] mb-4 leading-relaxed">
            The integrated terminal requires a persistent WebSocket connection, which is not supported in Serverless environments (Vercel).
          </p>
          <div className="flex gap-2">
             <Button variant="outline" size="sm" className="h-7 text-xs bg-white/5 border-white/10 hover:bg-white/10" asChild>
                <a href="https://github.com/robertpelloni/jules-autopilot/blob/main/docs/DEPLOY.md" target="_blank" rel="noopener noreferrer">
                   View Deployment Options
                </a>
             </Button>
          </div>
        </div>
      )}
    </div>
  );
}
