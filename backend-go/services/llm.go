package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// ── Ollama-only LLM layer ────────────────────────────────────────────────────
// All LLM calls go through local Ollama (http://localhost:11434) with the
// gemma3n:e4b model. No cloud providers, no API keys, no fallback chains.

const ollamaBaseURL = "http://localhost:11434"
const ollamaModel = "gemma3n:e4b"

type LLMMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type LLMUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type LLMResult struct {
	Content   string
	Usage     *LLMUsage
	LatencyMs float64
}

// normalizeProvider always returns "ollama" — the only provider.
func normalizeProvider(provider string) string {
	return "ollama"
}

// defaultModelForProvider always returns the single configured model.
func defaultModelForProvider(provider string) string {
	return ollamaModel
}

func resolveModel(provider, model string) string {
	// Always use the single configured model — all others removed
	return ollamaModel
}

func getSupervisorProvider() string {
	return "ollama"
}

// getSupervisorAPIKey returns a placeholder — Ollama needs no API key,
// but many call sites check for empty strings.
func getSupervisorAPIKey(provider string, explicit *string) string {
	return "ollama-local"
}

// ForceAttemptHTTP2=false prevents HTTP/2 goroutine/thread exhaustion.
// Timeout must accommodate the gemma3n:e4b cold-load (~200s on first call).
var llmHttpClient = &http.Client{
	Timeout: 300 * time.Second,
	Transport: &http.Transport{
		ForceAttemptHTTP2: false,
		MaxIdleConns:      4,
		IdleConnTimeout:   30 * time.Second,
	},
}

// Ollama local inference — limit to 2 concurrent calls.
var ollamaSem = make(chan struct{}, 2)

// generateLLMText is the single entry point. Always uses Ollama.
func generateLLMText(primaryProvider, primaryApiKey, primaryModel, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	model := resolveModel(primaryProvider, primaryModel)
	return generateOllamaText(model, systemPrompt, messages)
}

func generateOllamaText(model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	// Build Ollama chat messages
	ollamaMessages := make([]map[string]string, 0, len(messages)+1)
	if strings.TrimSpace(systemPrompt) != "" {
		ollamaMessages = append(ollamaMessages, map[string]string{"role": "system", "content": systemPrompt})
	}
	for _, m := range messages {
		role := m.Role
		if role == "system" {
			role = "user"
		}
		ollamaMessages = append(ollamaMessages, map[string]string{"role": role, "content": m.Content})
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"model":    model,
		"messages": ollamaMessages,
		"stream":   false,
		"options": map[string]interface{}{
			"temperature": 0.2,
		},
	})

	ollamaSem <- struct{}{}
	defer func() { <-ollamaSem }()

	start := time.Now()
	req, err := http.NewRequest(http.MethodPost, ollamaBaseURL+"/api/chat", bytes.NewReader(requestBody))
	if err != nil {
		return LLMResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := llmHttpClient.Do(req)
	if err != nil {
		return LLMResult{}, fmt.Errorf("ollama request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return LLMResult{}, fmt.Errorf("ollama request failed (%d): %s", resp.StatusCode, string(body))
	}

	var data struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		Done               bool `json:"done"`
		PromptEvalCount    int  `json:"prompt_eval_count"`
		EvalCount          int  `json:"eval_count"`
		TotalDuration      int64 `json:"total_duration"`
		LoadDuration       int64 `json:"load_duration"`
		PromptEvalDuration int64 `json:"prompt_eval_duration"`
		EvalDuration       int64 `json:"eval_duration"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return LLMResult{}, fmt.Errorf("failed to decode ollama response: %w", err)
	}

	content := strings.TrimSpace(data.Message.Content)
	if content == "" {
		return LLMResult{}, fmt.Errorf("ollama returned empty content")
	}

	latency := float64(time.Since(start).Milliseconds())

	return LLMResult{
		Content:   content,
		LatencyMs: latency,
		Usage: &LLMUsage{
			PromptTokens:     data.PromptEvalCount,
			CompletionTokens: data.EvalCount,
			TotalTokens:      data.PromptEvalCount + data.EvalCount,
		},
	}, nil
}

func extractJSONBlock(input string) string {
	start := strings.Index(input, "{")
	end := strings.LastIndex(input, "}")
	if start == -1 || end == -1 || end <= start {
		return ""
	}
	return input[start : end+1]
}

func extractRiskScoreFromText(input string) int {
	digits := strings.Builder{}
	for _, r := range input {
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
		}
	}
	if digits.Len() == 0 {
		return defaultPlanRiskScore
	}
	var score int
	fmt.Sscanf(digits.String(), "%d", &score)
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

func generateStructuredJSON(provider, apiKey, model, systemPrompt string, messages []LLMMessage, target interface{}) error {
	result, err := generateLLMText(provider, apiKey, model, systemPrompt, messages)
	if err != nil {
		return err
	}
	jsonBlock := extractJSONBlock(result.Content)
	if jsonBlock == "" {
		return fmt.Errorf("response did not contain JSON")
	}
	if err := json.Unmarshal([]byte(jsonBlock), target); err != nil {
		return err
	}
	return nil
}

func generateRiskScore(provider, apiKey, model, topic, summary string, fallback int) int {
	prompt := fmt.Sprintf("Analyze the following debate summary and provide a risk score between 0 and 100. 100 = extremely high risk, 0 = extremely low risk. Respond with ONLY the number.\n\nTopic: %s\nSummary:\n%s", topic, summary)
	result, err := generateLLMText(provider, apiKey, model, "You are a strict technical risk scorer. Respond with a number only.", []LLMMessage{{Role: "user", Content: prompt}})
	if err != nil {
		return fallback
	}
	return extractRiskScoreFromText(result.Content)
}

// ensure model is referenced (avoids unused-import lint)
var _ = models.KeeperSettings{}
var _ = db.DB
