// JulesAutopilot watchdog — polls backend health, restarts if down.
// Registered as Scheduled Task "JulesAutopilotWatchdog", every 2 minutes.
// Node-based: PowerShell hangs on this box, so the .ps1 approach is unusable here.
// Differs from setup_watchdog_task.ps1: targets "jules-autopilot.exe" (actual exe
// name) and launches the compiled exe (not "go run .").
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const DIR = __dirname;
const LOG = path.join(DIR, 'watchdog.log');
const EXE = path.join(DIR, 'jules-autopilot.exe');
const URL = 'http://127.0.0.1:8082/api/health';
const OLLAMA_URL = 'http://127.0.0.1:11434/';

function log(msg) {
  fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`);
}

function check() {
  return new Promise((resolve) => {
    const req = http.get(URL, { timeout: 8000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

async function checkOllama() {
  const up = await new Promise((resolve) => {
    const req = http.get(OLLAMA_URL, { timeout: 8000 }, (res) => {
      res.resume();
      resolve(res.statusCode < 500);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
  if (up) return;
  log('Ollama DOWN - Starting ollama serve');
  try {
    const child = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    log(`Started ollama serve (PID: ${child.pid})`);
  } catch (e) {
    log(`Failed to start ollama serve: ${e.message}`);
  }
}

(async () => {
  if (await check()) {
    await checkOllama();
    process.exit(0);
  }
  log('DOWN - Restarting backend');
  try { execSync('taskkill /F /IM jules-autopilot.exe', { stdio: 'ignore' }); } catch {}
  await new Promise((s) => setTimeout(s, 3000));
  const child = spawn(EXE, [], { cwd: DIR, detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  log(`Started backend (PID: ${child.pid})`);
  for (let i = 0; i < 6; i++) {
    await new Promise((s) => setTimeout(s, 10000));
    if (await check()) { log('Backend is healthy'); break; }
  }
  process.exit(0);
})();
