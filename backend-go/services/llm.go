package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

type circuitBreaker struct {
	mu          sync.RWMutex
	failures    map[string]int
	openUntil   map[string]time.Time
	failureLimit int
	openDuration time.Duration
}

var cb = &circuitBreaker{
	failures:     make(map[string]int),
	openUntil:    make(map[string]time.Time),
	failureLimit: 3,
	openDuration: 5 * time.Minute,
}

func (c *circuitBreaker) isOpen(provider string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if t, exists := c.openUntil[provider]; exists && time.Now().Before(t) {
		return true
	}
	return false
}

func (c *circuitBreaker) recordSuccess(provider string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.failures, provider)
	delete(c.openUntil, provider)
}

func (c *circuitBreaker) recordFailure(provider string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.failures[provider]++
	if c.failures[provider] >= c.failureLimit {
		c.openUntil[provider] = time.Now().Add(c.openDuration)
		addKeeperLog(fmt.Sprintf("Circuit breaker tripped for %s provider. Traffic will be routed to fallbacks for %v.", provider, c.openDuration), "error", "global", map[string]interface{}{
			"event":    "circuit_breaker_tripped",
			"provider": provider,
		})
	}
}

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

func normalizeProvider(provider string) string {
	value := strings.ToLower(strings.TrimSpace(provider))
	if value == "" {
		return "openrouter"
	}
	return value
}

func defaultModelForProvider(provider string) string {
	switch normalizeProvider(provider) {
	case "lmstudio":
		return "gemma-4-e4b-uncensored-hauhaucs-aggressive"
	case "localproxy":
		return "free-llm"
	case "openrouter":
		return "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
	case "gemini":
		return "gemini-2.0-flash"
	default:
		return "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
	}
}

func resolveModel(provider, model string) string {
	value := strings.TrimSpace(model)
	if value == "" || value == "free" || value == "default" {
		return defaultModelForProvider(provider)
	}
	return value
}

func getSupervisorProvider() string {
	if db.DB == nil {
		return "openrouter"
	}
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return "openrouter"
	}
	return normalizeProvider(settings.SupervisorProvider)
}

func getSupervisorAPIKey(provider string, explicit *string) string {
	if explicit != nil {
		value := strings.TrimSpace(*explicit)
		if value != "" && value != "placeholder" && value != "undefined" && value != "null" {
			return value
		}
	}
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "lmstudio":
		return "placeholder"
	case "localproxy":
		return "placeholder"
	case "openrouter":
		if key := strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY")); key != "" {
			return key
		}
	case "gemini":
		if key := strings.TrimSpace(os.Getenv("GEMINI_API_KEY")); key != "" {
			return key
		}
		if key := strings.TrimSpace(os.Getenv("GOOGLE_API_KEY")); key != "" {
			return key
		}
		if key := strings.TrimSpace(os.Getenv("JULES_API_KEY")); key != "" && strings.HasPrefix(key, "AQ.A") {
			return key
		}
	}
	return ""
}

func generateLLMText(primaryProvider, primaryApiKey, primaryModel, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	primaryProvider = normalizeProvider(primaryProvider)
	primaryModel = resolveModel(primaryProvider, primaryModel)

	// Fallback chain: Primary -> Gemini -> OpenRouter -> LocalProxy -> LMStudio
	providers := []string{primaryProvider}
	fallbacks := []string{"gemini", "openrouter", "localproxy", "lmstudio"}
	for _, p := range fallbacks {
		exists := false
		for _, existing := range providers {
			if existing == p {
				exists = true
				break
			}
		}
		if !exists {
			providers = append(providers, p)
		}
	}

	var lastErr error
	for i, provider := range providers {
		if cb.isOpen(provider) {
			lastErr = fmt.Errorf("provider %s is currently unavailable (circuit breaker open)", provider)
			continue
		}

		apiKey := primaryApiKey
		model := primaryModel
		if i > 0 {
			// This is a fallback attempt
			apiKey = getSupervisorAPIKey(provider, nil)
		if provider != "lmstudio" && provider != "localproxy" && (apiKey == "" || apiKey == "placeholder") {
				continue // Cannot fallback without an API key (lmstudio is local, no key needed)
			}
			model = resolveModel(provider, "")
		}

		var result LLMResult
		var err error

		if provider == "gemini" {
			result, err = generateGeminiText(apiKey, model, systemPrompt, messages)
		} else {
			result, err = generateOpenRouterText(apiKey, model, systemPrompt, messages)
		}

		if err != nil {
			log.Printf("[LLM] Provider %s failed: %v", provider, err)
			lastErr = err
			errStr := err.Error()
			RecordLLMLatency(provider, result.LatencyMs, false)
			if strings.TrimSpace(apiKey) != "" && apiKey != "placeholder" {
				// Record failure for circuit breaker on 429 or 5xx
				if strings.Contains(errStr, "429") || strings.Contains(errStr, "RESOURCE_EXHAUSTED") || strings.Contains(errStr, "502") || strings.Contains(errStr, "503") || strings.Contains(errStr, "timeout") {
					cb.recordFailure(provider)
				}
			}
			continue
		}

		// Success
		cb.recordSuccess(provider)
		RecordLLMLatency(provider, result.LatencyMs, true)

		if result.Usage != nil {
			go func() {
				_ = RecordTokenUsage(nil, provider, model, result.Usage.PromptTokens, result.Usage.CompletionTokens, "other", 0, true)
			}()
		}

		if i > 0 {
			addKeeperLog(fmt.Sprintf("Self-healing successful: rerouted LLM request from %s to %s.", primaryProvider, provider), "action", "global", map[string]interface{}{
				"event":            "llm_fallback_success",
				"originalProvider": primaryProvider,
				"fallbackProvider": provider,
			})
		}
		return result, nil
	}

	return LLMResult{}, fmt.Errorf("all LLM providers failed. last error: %v", lastErr)
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

func generateGeminiText(apiKey, model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	start := time.Now()

	// Map generic model names to Gemini-specific ones if needed
	geminiModel := model
	if !strings.HasPrefix(geminiModel, "models/") {
		geminiModel = "models/" + geminiModel
	}

	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/%s:generateContent?key=%s", geminiModel, apiKey)

	type GeminiContent struct {
		Role  string              `json:"role,omitempty"`
		Parts []map[string]string `json:"parts"`
	}

	var contents []GeminiContent

	// Note: v1beta has system_instruction, but for simplicity we'll prepend it to the first user message
	// or use the system_instruction field if supported.

	for _, msg := range messages {
		contents = append(contents, GeminiContent{
			Role:  map[bool]string{true: "user", false: "model"}[msg.Role == "user" || msg.Role == "system"],
			Parts: []map[string]string{{"text": msg.Content}},
		})
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"contents": contents,
		"generationConfig": map[string]interface{}{
			"temperature":     0.2,
			"maxOutputTokens": 1024,
		},
		"system_instruction": map[string]interface{}{
			"parts": []map[string]string{{"text": systemPrompt}},
		},
	})

	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewReader(requestBody))
	if err != nil {
		return LLMResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	log.Printf("[LLM] Sending request to Gemini (%s)", geminiModel)
	resp, err := llmHttpClient.Do(req)
	if err != nil {
		return LLMResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return LLMResult{}, fmt.Errorf("Gemini request failed (%d): %s", resp.StatusCode, string(body))
	}

	var data struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
			FinishReason string `json:"finishReason"`
		} `json:"candidates"`
		UsageMetadata struct {
			PromptTokenCount     int `json:"promptTokenCount"`
			CandidatesTokenCount int `json:"candidatesTokenCount"`
			TotalTokenCount      int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return LLMResult{}, err
	}

	if len(data.Candidates) == 0 || len(data.Candidates[0].Content.Parts) == 0 {
		return LLMResult{}, fmt.Errorf("Gemini response contained no candidates")
	}

	resultContent := data.Candidates[0].Content.Parts[0].Text
	return LLMResult{
		Content:   strings.TrimSpace(resultContent),
		LatencyMs: float64(time.Since(start).Milliseconds()),
		Usage: &LLMUsage{
			PromptTokens:     data.UsageMetadata.PromptTokenCount,
			CompletionTokens: data.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      data.UsageMetadata.TotalTokenCount,
		},
	}, nil
}

var llmHttpClient = &http.Client{
	Timeout: 90 * time.Second,
}

// generateOpenRouterText handles all OpenAI-compatible API calls (openrouter + lmstudio).
// It auto-detects the API URL from the model name and API key prefix.
func generateOpenRouterText(apiKey, model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	start := time.Now()

	// Determine API URL from model/key
	apiURL := "https://openrouter.ai/api/v1/chat/completions"
	if strings.Contains(model, "lmstudio") || strings.HasPrefix(model, "gemma-4") {
		apiURL = "http://localhost:1234/v1/chat/completions"
	} else if strings.Contains(model, "free-llm") || strings.HasPrefix(model, "nvidia/nemotron-3-ultra") || strings.HasPrefix(model, "mistral-medium") || strings.HasPrefix(model, "devstral") || strings.HasPrefix(model, "codestral") || strings.HasPrefix(model, "magistral") {
		apiURL = "http://localhost:4000/v1/chat/completions"
	}

	requestMessages := make([]map[string]string, 0, len(messages)+1)
	if strings.TrimSpace(systemPrompt) != "" {
		requestMessages = append(requestMessages, map[string]string{"role": "system", "content": systemPrompt})
	}
	for _, message := range messages {
		requestMessages = append(requestMessages, map[string]string{"role": message.Role, "content": message.Content})
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"model":      model,
		"messages":   requestMessages,
		"temperature": 0.2,
		"max_tokens": 512,
	})

	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewReader(requestBody))
	if err != nil {
		return LLMResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	// OpenRouter-specific headers
	if strings.Contains(apiURL, "openrouter.ai") {
		req.Header.Set("HTTP-Referer", "https://jules-autopilot.render.com")
		req.Header.Set("X-Title", "Jules Autopilot")
	}

	log.Printf("[LLM] Sending request to %s (model: %s)", apiURL, model)

	// Retry logic for local providers that may need model reload time
	maxRetries := 0
	isLMStudio := strings.Contains(apiURL, "localhost:1234")
	if isLMStudio {
		maxRetries = 3
	}

	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			log.Printf("[LLM] Retrying LM Studio request (attempt %d/%d) after model reload delay", attempt+1, maxRetries+1)
			time.Sleep(time.Duration(attempt) * 3 * time.Second) // 3s, 6s, 9s delays
		}

		// Rebuild request for each attempt (body is consumed by Do)
		retryReq, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewReader(requestBody))
		if err != nil {
			return LLMResult{}, err
		}
		retryReq.Header.Set("Authorization", "Bearer "+apiKey)
		retryReq.Header.Set("Content-Type", "application/json")
		if strings.Contains(apiURL, "openrouter.ai") {
			retryReq.Header.Set("HTTP-Referer", "https://jules-autopilot.render.com")
			retryReq.Header.Set("X-Title", "Jules Autopilot")
		}

		resp, err := llmHttpClient.Do(retryReq)
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode >= 400 {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			errBody := string(body)

			// LM Studio "Model unloaded" -- retry after reload
			if isLMStudio && attempt < maxRetries && (strings.Contains(errBody, "Model unloaded") || strings.Contains(errBody, "model not found") || strings.Contains(errBody, "not loaded")) {
				log.Printf("[LLM] LM Studio model not loaded (attempt %d/%d): %s", attempt+1, maxRetries+1, errBody[:min(len(errBody), 100)])
				lastErr = fmt.Errorf("LLM request to %s failed (%d): %s", apiURL, resp.StatusCode, errBody)
				continue // retry
			}

			return LLMResult{}, fmt.Errorf("LLM request to %s failed (%d): %s", apiURL, resp.StatusCode, errBody)
		}

		// Success -- decode response
		var data struct {
			Choices []struct {
				Message struct {
					Content string `json:"content"`
					ReasoningContent string `json:"reasoning_content"`
					Reasoning string `json:"reasoning"`
				} `json:"message"`
			} `json:"choices"`
			Usage struct {
				PromptTokens int `json:"prompt_tokens"`
				CompletionTokens int `json:"completion_tokens"`
				TotalTokens int `json:"total_tokens"`
			} `json:"usage"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			resp.Body.Close()
			return LLMResult{}, err
		}
		resp.Body.Close()
		if len(data.Choices) == 0 {
			return LLMResult{}, fmt.Errorf("LLM response contained no choices")
		}
		// Use content field, fall back to reasoning_content then reasoning for reasoning models
		resultContent := strings.TrimSpace(data.Choices[0].Message.Content)
		if resultContent == "" {
			resultContent = strings.TrimSpace(data.Choices[0].Message.ReasoningContent)
		}
		if resultContent == "" {
			resultContent = strings.TrimSpace(data.Choices[0].Message.Reasoning)
		}
		if resultContent == "" {
			return LLMResult{}, fmt.Errorf("LLM returned empty content (finish_reason may be length)")
		}
		return LLMResult{
			Content: resultContent,
			LatencyMs: float64(time.Since(start).Milliseconds()),
			Usage: &LLMUsage{
				PromptTokens: data.Usage.PromptTokens,
				CompletionTokens: data.Usage.CompletionTokens,
				TotalTokens: data.Usage.TotalTokens,
			},
		}, nil
	}

	return LLMResult{}, fmt.Errorf("LLM request to %s failed after %d attempts: %w", apiURL, maxRetries+1, lastErr)
	}
