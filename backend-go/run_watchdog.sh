#!/bin/bash
PORT=8081
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

exec >> watchdog.log 2>&1

echo "[$(date)] Watchdog started for backend on port $PORT (PID: $$)"

while true; do
    if ! curl -sf --connect-timeout 5 "http://127.0.0.1:$PORT/api/health" > /dev/null 2>&1; then
        echo "[$(date)] DOWN - Restarting backend"
        powershell -Command "Get-Process -Name 'backend' -ErrorAction SilentlyContinue | Stop-Process -Force" > /dev/null 2>&1
        sleep 3
        go run . >> server.log 2>&1 &
        echo "[$(date)] Backend restarted (PID: $!)"
        for i in 1 2 3 4 5 6; do
            sleep 5
            if curl -sf --connect-timeout 3 "http://127.0.0.1:$PORT/api/health" > /dev/null 2>&1; then
                echo "[$(date)] Backend is healthy"
                break
            fi
        done
    fi
    sleep 30
done
