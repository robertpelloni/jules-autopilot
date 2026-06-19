import sqlite3
import json
import urllib.request
from collections import Counter

print("=" * 60)
print("10-MIN MONITORING - Port 8082 (PID 51584)")
print("=" * 60)

try:
    resp = urllib.request.urlopen("http://127.0.0.1:8082/api/health", timeout=10)
    health = json.loads(resp.read())
    q = health["queue"]
    print(
        "\n0. Health: %s | Queue: %dp/%da"
        % (health["status"], q["pending"], q["processing"])
    )
except Exception as e:
    print("\n0. Health check FAILED: %s" % e)

conn = sqlite3.connect("backend-go/dev.db")
cursor = conn.cursor()

cursor.execute(
    "SELECT COUNT(*) FROM keeper_logs WHERE type='error' AND created_at > datetime('now', '-10 minutes')"
)
errs = cursor.fetchone()[0]
cursor.execute(
    "SELECT COUNT(*) FROM keeper_logs WHERE message LIKE '%%429%%' AND created_at > datetime('now', '-10 minutes')"
)
r429 = cursor.fetchone()[0]
cursor.execute(
    "SELECT COUNT(*) FROM keeper_logs WHERE message LIKE '%%deadline%%' AND created_at > datetime('now', '-10 minutes')"
)
timeouts = cursor.fetchone()[0]
print("\n1. DB Errors (10m): %d | 429s: %d | Timeouts: %d" % (errs, r429, timeouts))

cursor.execute(
    "SELECT message, created_at FROM keeper_logs WHERE type='error' AND created_at > datetime('now', '-10 minutes') ORDER BY created_at DESC LIMIT 5"
)
rows = cursor.fetchall()
for row in rows:
    print("   %s | %s" % (str(row[1])[11:19], row[0][:120]))
if not rows:
    print("   (none)")

caps = {
    "keeper_logs": 200,
    "notifications": 50,
    "queue_jobs": 100,
    "audit_entries": 500,
}
for table, cap in caps.items():
    cursor.execute("SELECT COUNT(*) FROM %s" % table)
    count = cursor.fetchone()[0]
    status = "OK" if count <= cap * 1.1 else "OVER"
    print("   %s: %d (cap %d) [%s]" % (table, count, cap, status))

cursor.execute("SELECT COUNT(*) FROM queue_jobs WHERE deleted_at IS NOT NULL")
print("   Soft-deleted zombies: %d" % cursor.fetchone()[0])
cursor.execute(
    "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
)
print("   DB size: %.1f MB" % (cursor.fetchone()[0] / 1024 / 1024))

try:
    resp = urllib.request.urlopen("http://127.0.0.1:8082/api/sessions", timeout=130)
    data = json.loads(resp.read())
    sessions = data.get("sessions", [])
    states = Counter(s.get("rawState", "?") for s in sessions)
    print("\n2. Sessions: %d total" % len(sessions))
    for state, count in states.most_common():
        print("   %s: %d" % (state, count))
except Exception as e:
    print("\n2. Sessions fetch failed: %s" % e)

try:
    resp = urllib.request.urlopen("http://127.0.0.1:8082/api/system/info", timeout=10)
    si = json.loads(resp.read())
    uptime_min = si.get("uptimeSeconds", 0) / 60
    print(
        "\n3. System: HeapAlloc=%sMB | HeapSys=%sMB | Goroutines=%s | Uptime=%.1fmin"
        % (
            si.get("heapAllocMB"),
            si.get("heapSysMB"),
            si.get("numGoroutine"),
            uptime_min,
        )
    )
except Exception as e:
    print("\n3. System info failed: %s" % e)

try:
    resp = urllib.request.urlopen(
        "http://127.0.0.1:8082/api/health/dependencies", timeout=10
    )
    dep = json.loads(resp.read())
    print("   Dependencies: %s" % dep.get("overall"))
    for c in dep.get("checks", []):
        if c["status"] != "ok":
            print("   [!!] %s: %s" % (c["name"], c.get("message", "")[:80]))
except Exception as e:
    print("   Dependencies check failed: %s" % e)

with open("backend.log", "r", encoding="utf-8", errors="replace") as f:
    loglines = f.readlines()

results = Counter()
for l in loglines:
    if "completed:" in l:
        result = l.split("completed: ")[-1].strip()
        results[result] += 1
print("\n4. Job results:")
for result, count in results.most_common():
    print("   %s: %d" % (result, count))

or_calls = sum(1 for l in loglines if "openrouter.ai" in l and "LLM] Sending" in l)
lp_calls = sum(1 for l in loglines if "localhost:4000" in l and "LLM] Sending" in l)
lm_calls = sum(1 for l in loglines if "localhost:1234" in l and "LLM] Sending" in l)
gemini_calls = sum(
    1 for l in loglines if "generativelanguage" in l and "LLM] Sending" in l
)
llm_failures = sum(1 for l in loglines if "LLM nudge generation failed" in l)
llm_success = sum(
    1 for l in loglines if "LLM nudge generated" in l and "failed" not in l
)
or_fail = sum(1 for l in loglines if "Provider openrouter failed" in l)
gemini_fail = sum(1 for l in loglines if "Provider gemini failed" in l)
lp_fail = sum(1 for l in loglines if "Provider localproxy failed" in l)
lm_fail = sum(1 for l in loglines if "Provider lmstudio failed" in l)
circuit_trips = sum(1 for l in loglines if "Circuit breaker tripped" in l)
print(
    "\n5. LLM calls: OR=%d | Gemini=%d | LP=%d | LM=%d"
    % (or_calls, gemini_calls, lp_calls, lm_calls)
)
print("   LLM success: %d | Failures: %d" % (llm_success, llm_failures))
print(
    "   Provider failures: OR=%d | Gemini=%d | LP=%d | LM=%d"
    % (or_fail, gemini_fail, lp_fail, lm_fail)
)
print("   Circuit breaker trips: %d" % circuit_trips)

skips = sum(1 for l in loglines if "Skipping activity fetch" in l)
fetches = sum(1 for l in loglines if "[Jules] GET" in l)
total = skips + fetches
eff = skips / total * 100 if total > 0 else 0
print("   API fetches: %d | Skips: %d | Efficiency: %.0f%%" % (fetches, skips, eff))

jules_timeouts = [l.strip() for l in loglines if "Failed to fetch live sessions" in l]
llm_timeouts = [
    l.strip() for l in loglines if "Provider" in l and "deadline exceeded" in l
]
gemini_404s = [
    l.strip() for l in loglines if "Provider gemini failed" in l and "404" in l
]
print("\n6. Jules ListSessions timeouts: %d" % len(jules_timeouts))
print("   LLM provider timeouts: %d" % len(llm_timeouts))
print("   Gemini 404s: %d" % len(gemini_404s))
for l in (jules_timeouts + llm_timeouts + gemini_404s)[-5:]:
    print("   %s" % l[:200])

error_lines = [
    l.strip()
    for l in loglines
    if any(
        p in l.lower()
        for p in [
            "error",
            "fail",
            "429",
            "deadline",
            "timeout",
            "panic",
            "eof",
            "refused",
            "circuit breaker",
        ]
    )
    and "CI Monitor" not in l
    and "Worker] Checking" not in l
    and "pageToken" not in l
    and "Executing check_session" not in l
    and "No CI failures" not in l
    and "Purged" not in l
]
print("   General error lines: %d" % len(error_lines))
for l in error_lines[-8:]:
    print("   %s" % l[:200])

job_times = []
current_start_time = None
for l in loglines:
    if "Executing check_session job" in l:
        current_start_time = l[11:19]
    elif "completed:" in l and current_start_time:
        end_time = l[11:19]
        try:
            sh, sm, ss = (
                int(current_start_time[0:2]),
                int(current_start_time[3:5]),
                int(current_start_time[6:8]),
            )
            eh, em, es = int(end_time[0:2]), int(end_time[3:5]), int(end_time[6:8])
            dur = (eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss)
            if 0 <= dur <= 300:
                job_times.append(dur)
        except:
            pass
        current_start_time = None

if job_times:
    print(
        "\n7. Job timing: Avg=%.1fs | Min=%ds | Max=%ds | Count=%d"
        % (
            sum(job_times) / len(job_times),
            min(job_times),
            max(job_times),
            len(job_times),
        )
    )

panic_count = sum(1 for l in loglines if "panic" in l.lower())
jules_429 = sum(1 for l in loglines if "Jules API error" in l)
rate_limited = sum(1 for l in loglines if "Rate-limit backoff" in l)
ws_errors = sum(
    1
    for l in loglines
    if "WebSocket" in l and ("error" in l.lower() or "close" in l.lower())
)
cooldown_hits = sum(
    1
    for l in loglines
    if "cooldown" in l.lower()
    or "already processed" in l.lower()
    or "skipping recently" in l.lower()
)
print(
    "\n8. Panics: %d | Jules 429: %d | Rate-limited: %d | WS errors: %d"
    % (panic_count, jules_429, rate_limited, ws_errors)
)
print("   Cooldown hits: %d" % cooldown_hits)

# Check for repeated processing of same session
session_ids = []
for l in loglines:
    if "Checking session" in l:
        parts = l.split("Checking session")
        if len(parts) > 1:
            sid = parts[1].strip().split(" ")[0]
            session_ids.append(sid)
dupes = {}
if session_ids:
    sid_counts = Counter(session_ids)
    dupes = {k: v for k, v in sid_counts.items() if v > 1}
    print(
        "   Sessions checked: %d total | Unique: %d"
        % (len(session_ids), len(sid_counts))
    )
    if dupes:
        print("   [!!] Redundant checks: %s" % str(dupes))

print("\n" + "=" * 60)
if (
    errs == 0
    and panic_count == 0
    and len(jules_timeouts) == 0
    and len(gemini_404s) == 0
):
    print("  ALL SYSTEMS NOMINAL")
    if len(llm_timeouts) > 0:
        print("  NOTE: %d LLM provider timeouts (fallback handled)" % len(llm_timeouts))
    if dupes:
        print("  NOTE: %d sessions checked redundantly" % len(dupes))
else:
    issues = []
    if len(jules_timeouts) > 0:
        issues.append("%d ListSessions timeouts" % len(jules_timeouts))
    if gemini_404s:
        issues.append("%d Gemini 404s" % len(gemini_404s))
    if errs > 0:
        issues.append("%d DB errors" % errs)
    if panic_count > 0:
        issues.append("%d panics" % panic_count)
    print("  STATUS: %s" % ", ".join(issues))

conn.close()
