@echo off
echo [Start] Initializing Jules Autopilot Development Environment...

:: Check for node_modules
if not exist "node_modules" (
    echo [Setup] Installing dependencies...
    call npm install
)

:: Check for .env
if not exist ".env" (
    echo [Warning] .env file not found. Creating a template...
    echo PORT=8080 > .env
    echo JULES_API_KEY= >> .env
    echo [Action] Please fill in your JULES_API_KEY in the .env file.
)

echo [Prisma] Synchronizing database...
call npx prisma db push

echo [Server] Starting backend and frontend in development mode...
:: Run Vite frontend and Hono backend simultaneously using tsx and vite
:: We'll use a single command that runs both if possible, or just start dev
call npx tsx render-entry.ts
