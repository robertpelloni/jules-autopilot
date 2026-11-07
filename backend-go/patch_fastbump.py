import io
p = "backend-go/services/queue.go"
s = io.open(p, encoding="utf-8").read()

old_settings = """	// Load settings for LM Studio configuration
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		log.Println("[Broadcast] No keeper settings found, using defaults")
	}

	// Cache sessions so the dashboard loads instantly"""
new_settings = """	// Cache sessions so the dashboard loads instantly"""
assert s.count(old_settings) == 1, "settings anchor"
s = s.replace(old_settings, new_settings)

old_call = "if bumpSession(client, session, settings) {"
new_call = "if bumpSession(client, session) {"
assert s.count(old_call) == 1, "call anchor"
s = s.replace(old_call, new_call)

old_fn = """// bumpSession sends one "continue" bump to a session. Returns true on success.
func bumpSession(client *JulesClient, session models.JulesSession, settings models.KeeperSettings) bool {
	shortID := session.ID
	if len(shortID) > 8 {
		shortID = shortID[:8]
	}
	// Use Ollama to generate an intelligent bump message
	msg, err := generateNudgeMessage(session, settings)
	if err != nil {
		log.Printf("[Broadcast] Failed to generate nudge for %s: %v", shortID, err)
		// Fallback: send a simple bump
		msg = fmt.Sprintf("[Supervisor] Continue autonomous development on %s.", extractProjectName(session.SourceID))
	}
"""
new_fn = """// bumpSession sends one "continue" bump to a session. Returns true on success.
// The startup broadcast intentionally uses a fixed template message instead of
// per-session LLM nudges: with ~80 sessions behind a 2-slot Ollama queue, LLM
// generation stretches the broadcast past the process restart interval and the
// tail sessions never get bumped. Per-session intelligent nudges continue via
// the steady-state daemon check_session jobs.
func bumpSession(client *JulesClient, session models.JulesSession) bool {
	shortID := session.ID
	if len(shortID) > 8 {
		shortID = shortID[:8]
	}
	msg := fmt.Sprintf("[Supervisor] Continue autonomous development on %s.", extractProjectName(session.SourceID))
"""
assert s.count(old_fn) == 1, "fn anchor"
s = s.replace(old_fn, new_fn)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("FASTBUMP PATCHED")

