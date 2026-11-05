package services

import (
	"encoding/json"
	"testing"
)

func TestNormalizeReviewProviderInPackage(t *testing.T) {
	// normalizeProvider always returns "ollama"; getSupervisorAPIKey returns placeholder
	tests := []struct {
		name             string
		inputProvider    string
		inputAPIKey      string
		inputModel       string
		expectedProvider string
		expectedModel    string
	}{
		{"any provider becomes ollama", "anthropic", "", "claude-3", "ollama", "claude-3"},
		{"openai becomes ollama", "openai", "", "gpt-4", "ollama", "gpt-4"},
		{"empty becomes ollama", "", "", "", "ollama", "gemma3n:e4b"},
		{"explicit model preserved", "ollama", "", "custom-model", "ollama", "custom-model"},
		{"explicit api key", "openai", "sk-test-key", "gpt-4", "ollama", "gpt-4"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := ReviewRequest{
				Provider: tt.inputProvider,
				APIKey:   tt.inputAPIKey,
				Model:    tt.inputModel,
			}
			provider, _, model := normalizeReviewProvider(req)

			if provider != tt.expectedProvider {
				t.Errorf("provider = %q, want %q", provider, tt.expectedProvider)
			}
			if model != tt.expectedModel {
				t.Errorf("model = %q, want %q", model, tt.expectedModel)
			}
		})
	}
}

func TestStructuredReviewJSON(t *testing.T) {
	// Test JSON parsing of review results
	raw := `{"summary":"Code looks good","score":85,"issues":[{"severity":"low","category":"Style","description":"Minor formatting"}]}`
	var result ReviewResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		t.Fatalf("Failed to unmarshal review result: %v", err)
	}
	if result.Score != 85 {
		t.Errorf("Expected score 85, got %d", result.Score)
	}
}
