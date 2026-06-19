package services

import (
	"os"
	"testing"
	"time"
)

func TestNormalizeProvider(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"", "openrouter"},
		{"OpenAI", "openai"},
		{"ANTHROPIC", "anthropic"},
		{"Gemini", "gemini"},
		{"openai", "openai"},
	}

	for _, tt := range tests {
		result := normalizeProvider(tt.input)
		if result != tt.expected {
			t.Errorf("normalizeProvider(%q) = %q, expected %q", tt.input, result, tt.expected)
		}
	}
}

func TestDefaultModelForProvider(t *testing.T) {
	defaultModel := "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
	tests := []struct {
		provider string
		expected string
	}{
		{"openai", defaultModel},
		{"anthropic", defaultModel},
		{"gemini", "gemini-2.0-flash"},
		{"unknown", defaultModel},
		{"openrouter", defaultModel},
		{"lmstudio", "gemma-4-e4b-uncensored-hauhaucs-aggressive"},
	}

	for _, tt := range tests {
		result := defaultModelForProvider(tt.provider)
		if result != tt.expected {
			t.Errorf("defaultModelForProvider(%q) = %q, expected %q", tt.provider, result, tt.expected)
		}
	}
}

func TestResolveModel(t *testing.T) {
	defaultModel := "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
	// Empty model falls back to default
	if resolveModel("openai", "") != defaultModel {
		t.Error("Empty model should use default")
	}
	// Explicit model is used
	if resolveModel("openai", "gpt-4") != "gpt-4" {
		t.Error("Explicit model should be used")
	}
}

func TestExtractJSONBlock(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"valid json", `Here is the result: {"key": "value"} done`, `{"key": "value"}`},
		{"no json", "No json here", ""},
		{"nested json", `Result: {"outer": {"inner": 1}}`, `{"outer": {"inner": 1}}`},
		{"empty", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractJSONBlock(tt.input)
			if result != tt.expected {
				t.Errorf("extractJSONBlock() = %q, expected %q", result, tt.expected)
			}
		})
	}
}

func TestExtractRiskScoreFromText(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected int
	}{
		{"just number", "75", 75},
		{"number in text", "The risk score is 42 points", 42},
		{"no number", "high risk", 50}, // default
		{"over 100", "150 is too high", 100},
		{"negative", "-5", 5},
		{"zero", "0", 0},
		{"score and total", "Score: 85/100", 100}, // concatenates all digits: 85100, capped at 100
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractRiskScoreFromText(tt.input)
			if result != tt.expected {
				t.Errorf("extractRiskScoreFromText(%q) = %d, expected %d", tt.input, result, tt.expected)
			}
		})
	}
}

func TestCircuitBreaker(t *testing.T) {
	cb := &circuitBreaker{
		failures:     make(map[string]int),
		openUntil:    make(map[string]time.Time),
		failureLimit: 3,
		openDuration: 5 * time.Minute,
	}

	// Initially not open
	if cb.isOpen("test-provider") {
		t.Error("Circuit breaker should not be open initially")
	}

	// Record successes
	cb.recordSuccess("test-provider")
	if cb.isOpen("test-provider") {
		t.Error("Circuit breaker should not be open after success")
	}

	// Record failures up to limit
	cb.recordFailure("test-provider")
	cb.recordFailure("test-provider")
	if cb.isOpen("test-provider") {
		t.Error("Circuit breaker should not be open at limit-1")
	}

	cb.recordFailure("test-provider") // This should trip it
	if !cb.isOpen("test-provider") {
		t.Error("Circuit breaker should be open after 3 failures")
	}

	// Success should reset
	cb.recordSuccess("test-provider")
	if cb.isOpen("test-provider") {
		t.Error("Circuit breaker should close after success")
	}
}

func TestGenerateRiskScore(t *testing.T) {
	// Ensure we don't pick up real keys from environment
	oldKey := os.Getenv("OPENROUTER_API_KEY")
	os.Setenv("OPENROUTER_API_KEY", "")
	defer os.Setenv("OPENROUTER_API_KEY", oldKey)

	// Without real API key, should return fallback
	score := generateRiskScore("openai", "fake-key", "gpt-4o", "test topic", "test summary", 42)
	if score != 42 {
		t.Errorf("Expected fallback score 42, got %d", score)
	}
}

func TestDebateApprovalStatus(t *testing.T) {
	if debateApprovalStatus(10) != "approved" {
		t.Error("Score 10 should be approved")
	}
	if debateApprovalStatus(20) != "pending" {
		t.Error("Score 20 should be pending")
	}
	if debateApprovalStatus(55) != "flagged" {
		t.Error("Score 55 should be flagged")
	}
	if debateApprovalStatus(85) != "rejected" {
		t.Error("Score 85 should be rejected")
	}
}

func TestNormalizeReviewProvider(t *testing.T) {
	provider, apiKey, model := normalizeReviewProvider(ReviewRequest{
		Provider: "OpenAI",
		APIKey:   "test-key",
		Model:    "gpt-4",
	})
	if provider != "openai" {
		t.Errorf("Expected openai, got %s", provider)
	}
	if apiKey != "test-key" {
		t.Error("Expected test-key")
	}
	if model != "gpt-4" {
		t.Errorf("Expected gpt-4, got %s", model)
	}
}

func TestNormalizeDebateAPIKey(t *testing.T) {
	// Explicit key
	p := DebateParticipant{Provider: "openai", APIKey: "explicit-key"}
	result := normalizeDebateAPIKey(p)
	if result != "explicit-key" {
		t.Errorf("Expected explicit-key, got %s", result)
	}

	// Placeholder key
	p2 := DebateParticipant{Provider: "openai", APIKey: "placeholder"}
	result2 := normalizeDebateAPIKey(p2)
	// Should fall back to env (which may be empty in tests)
	_ = result2
}

// Note: parseTemplateTags and formatTemplateTags are in the api package, tested separately
