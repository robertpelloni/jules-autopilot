#!/bin/bash
# Watchdog for Jules Autopilot Go Backend
# Checks every 15s if the backend is alive, restarts if dead.
# Run: nohup bash watchdog.sh > watchdog.log 2>&1 &

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend-go"
PORT=8081
CHECK_INTERVAL=15
LOG_FILE="$BACKEND_DIR/server.log"
WATCHDOG_LOG="$BACKEND_DIR/watchdog.log"

log() {
	echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >>"$WATCHDOG_LOG"
}

cleanup() {
	log "Watchdog stopping. Killing backend..."
	powershell -Command "Get-Process -Name 'backend' -ErrorAction SilentlyContinue | Stop-Process -Force" 2>/dev/null
	exit 0
}
trap cleanup SIGINT SIGTERM

log "Watchdog started for backend on port $PORT (check every ${CHECK_INTERVAL}s)"

while true; do
	# Check if port is listening
	curl -sf --connect-timeout 5 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1
	if [ $? -ne 0 ]; then
		log "Backend not responding. Restarting..."

		# Kill any stale process
		powershell -Command "Get-Process -Name 'backend' -ErrorAction SilentlyContinue | Stop-Process -Force" 2>/dev/null
		sleep 2

		# Start fresh
		cd "$BACKEND_DIR" && nohup go run . >"$LOG_FILE" 2>&1 &
		BACKEND_PID=$!
		log "Started backend (PID: $BACKEND_PID)"

		# Wait for it to come up
		for i in $(seq 1 12); do
			sleep 5
			curl -sf --connect-timeout 3 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1
			if [ $? -eq 0 ]; then
				log "Backend is healthy after restart"
				break
			fi
			if [ $i -eq 12 ]; then
				log "Backend failed to start after 60s"
			fi
		done
	fi

	sleep "$CHECK_INTERVAL"
done
