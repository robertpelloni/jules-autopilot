package services

import (
	"fmt"
	"net/http"
	"testing"
)

func TestNormalizeProvider(t *testing.T) {
	// normalizeProvider always returns "ollama"
	tests := []struct {
		input    string
		expected string
	}{
		{"", "ollama"},
		{"OpenAI", "ollama"},
		{"ANTHROPIC", "ollama"},
		{"Gemini", "ollama"},
		{"openai", "ollama"},
		{"lmstudio", "ollama"},
	}

	for _, tt := range tests {
		result := normalizeProvider(tt.input)
		if result != tt.expected {
			t.Errorf("normalizeProvider(%q) = %q, expected %q", tt.input, result, tt.expected)
		}
	}
}

func TestDefaultModelForProvider(t *testing.T) {
	// All providers return the single Ollama model
	tests := []struct {
		provider string
		expected string
	}{
		{"openai", "gemma3n:e4b"},
		{"anthropic", "gemma3n:e4b"},
		{"gemini", "gemma3n:e4b"},
		{"unknown", "gemma3n:e4b"},
		{"ollama", "gemma3n:e4b"},
	}

	for _, tt := range tests {
		result := defaultModelForProvider(tt.provider)
		if result != tt.expected {
			t.Errorf("defaultModelForProvider(%q) = %q, expected %q", tt.provider, result, tt.expected)
		}
	}
}

func TestResolveModel(t *testing.T) {
	defaultModel := "gemma3n:e4b"
	// Empty model falls back to default
	if resolveModel("ollama", "") != defaultModel {
		t.Error("Empty model should use default")
	}
	// Explicit model is used
	if resolveModel("ollama", "custom-model") != "custom-model" {
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

type mockTransport struct {
	roundTrip func(req *http.Request) (*http.Response, error)
}

func (m *mockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	return m.roundTrip(req)
}

func TestGenerateRiskScore(t *testing.T) {
	// Mock http transport to return error immediately
	oldDefaultTransport := http.DefaultTransport
	defer func() {
		http.DefaultTransport = oldDefaultTransport
	}()
	mock := &mockTransport{
		roundTrip: func(req *http.Request) (*http.Response, error) {
			return nil, fmt.Errorf("mocked connection error")
		},
	}
	http.DefaultTransport = mock

	// Without Ollama running, should return fallback
	score := generateRiskScore("ollama", "", "gemma3n:e4b", "test topic", "test summary", 42)
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
	if provider != "ollama" {
		t.Errorf("Expected ollama, got %s", provider)
	}
	// API key is ignored for Ollama
	_ = apiKey
	// Model is preserved if explicitly set
	_ = model
}

func TestNormalizeDebateAPIKey(t *testing.T) {
	// Ollama needs no API key
	p := DebateParticipant{Provider: "ollama", APIKey: "explicit-key"}
	result := normalizeDebateAPIKey(p)
	_ = result

	p2 := DebateParticipant{Provider: "ollama", APIKey: "placeholder"}
	result2 := normalizeDebateAPIKey(p2)
	_ = result2
}
