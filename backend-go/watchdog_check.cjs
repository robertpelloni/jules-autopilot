// JulesAutopilot watchdog - polls backend health, restarts if down.
// Registered as Scheduled Task "JulesAutopilotWatchdog", every 2 minutes.
// Node-based: PowerShell hangs on this box, so the .ps1 approach is unusable here.
// Differs from setup_watchdog_task.ps1: targets "jules-autopilot.exe" (actual exe
// name) and launches the compiled exe (not "go run .").
//
// Restart policy (v3.7.3): a single failed probe does NOT restart the backend.
// The health probe has an 8s timeout while the backend DB check can stall
// under startup-broadcast load, so one slow response is expected noise. Only
// MAX_FAILURES consecutive failures (~6 min down) trigger taskkill + restart.
// A lock file prevents overlapping scheduled runs from double-spawning the exe.
// Every spawned backend is set to BelowNormal CPU priority (standing rule:
// heavyweight processes must not starve the interactive system).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const DIR = __dirname;
const LOG = path.join(DIR, 'watchdog.log');
const EXE = path.join(DIR, 'jules-autopilot.exe');
const URL = 'http://127.0.0.1:8082/api/health';
const OLLAMA_URL = 'http://127.0.0.1:11434/';

const FAILURES_FILE = path.join(DIR, 'watchdog_failures.txt');
const LOCK_FILE = path.join(DIR, 'watchdog.lock');
const MAX_FAILURES = 3;
const LOCK_TTL_MS = 4 * 60 * 1000;

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
    lowerPriority(child.pid);
    log(`Started ollama serve (PID: ${child.pid})`);
  } catch (e) {
    log(`Failed to start ollama serve: ${e.message}`);
  }
}

function lowerPriority(pid) {
  try {
    execSync("powershell -NoProfile -Command (Get-Process -Id " + pid + ").PriorityClass='BelowNormal'", { stdio: 'ignore' });
  } catch {}
}

function readFailures() {
  try {
    const n = parseInt(fs.readFileSync(FAILURES_FILE, 'utf8').trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeFailures(n) {
  try { fs.writeFileSync(FAILURES_FILE, String(n)); } catch {}
}

function clearFailures() {
  try { fs.unlinkSync(FAILURES_FILE); } catch {}
}

function acquireLock() {
  const now = Date.now();
  try {
    const ts = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
    if (Number.isFinite(ts) && now - ts < LOCK_TTL_MS) return false;
  } catch {}
  try { fs.writeFileSync(LOCK_FILE, String(now)); } catch {}
  return true;
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch {}
}

async function main() {
  if (!acquireLock()) {
    log('Previous watchdog run still active - skipping');
    return;
  }
  try {
    if (await check()) {
      clearFailures();
      await checkOllama();
      return;
    }
    const failures = readFailures() + 1;
    writeFailures(failures);
    if (failures < MAX_FAILURES) {
      log(`DOWN (probe ${failures}/${MAX_FAILURES}) - waiting for confirmation before restart`);
      return;
    }
    log(`DOWN (${failures} consecutive probes) - Restarting backend`);
    try { execSync('taskkill /F /IM jules-autopilot.exe', { stdio: 'ignore' }); } catch {}
    await new Promise((s) => setTimeout(s, 3000));
    const child = spawn(EXE, [], { cwd: DIR, detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    lowerPriority(child.pid);
    log(`Started backend (PID: ${child.pid})`);
    for (let i = 0; i < 6; i++) {
      await new Promise((s) => setTimeout(s, 10000));
      if (await check()) { log('Backend is healthy'); break; }
    }
    clearFailures();
  } finally {
    releaseLock();
  }
}

main().then(
  () => process.exit(0),
  (e) => { try { log(`watchdog error: ${e && e.message}`); } catch {} process.exit(0); }
);