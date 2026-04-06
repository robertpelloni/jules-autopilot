package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

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
	Content string
	Usage   *LLMUsage
}

func normalizeProvider(provider string) string {
	value := strings.ToLower(strings.TrimSpace(provider))
	if value == "" {
		return "openai"
	}
	return value
}

func defaultModelForProvider(provider string) string {
	switch normalizeProvider(provider) {
	case "anthropic":
		return "claude-3-5-sonnet-latest"
	case "gemini":
		return "gemini-1.5-flash"
	default:
		return "gpt-4o-mini"
	}
}

func resolveModel(provider, model string) string {
	value := strings.TrimSpace(model)
	if value != "" {
		return value
	}
	return defaultModelForProvider(provider)
}

func getSupervisorAPIKey(provider string, explicit *string) string {
	if explicit != nil {
		value := strings.TrimSpace(*explicit)
		if value != "" && value != "placeholder" && value != "undefined" && value != "null" {
			return value
		}
	}

	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "anthropic":
		if key := strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")); key != "" {
			return key
		}
	case "gemini":
		if key := strings.TrimSpace(os.Getenv("GOOGLE_API_KEY")); key != "" {
			return key
		}
		if key := strings.TrimSpace(os.Getenv("GEMINI_API_KEY")); key != "" {
			return key
		}
	default:
		if key := strings.TrimSpace(os.Getenv("OPENAI_API_KEY")); key != "" {
			return key
		}
	}

	fallbacks := []string{"OPENAI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"}
	for _, envKey := range fallbacks {
		if value := strings.TrimSpace(os.Getenv(envKey)); value != "" {
			return value
		}
	}
	return ""
}

func generateLLMText(provider, apiKey, model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {
	provider = normalizeProvider(provider)
	model = resolveModel(provider, model)

	switch provider {
	case "anthropic":
		return generateAnthropicText(apiKey, model, systemPrompt, messages)
	case "gemini":
		return generateGeminiText(apiKey, model, systemPrompt, messages)
	default:
		return generateOpenAIText(apiKey, model, systemPrompt, messages)
	}
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

func generateOpenAIText(apiKey, model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {

	requestMessages := make([]map[string]string, 0, len(messages)+1)
	if strings.TrimSpace(systemPrompt) != "" {
		requestMessages = append(requestMessages, map[string]string{"role": "system", "content": systemPrompt})
	}
	for _, message := range messages {
		requestMessages = append(requestMessages, map[string]string{"role": message.Role, "content": message.Content})
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"model":       model,
		"messages":    requestMessages,
		"temperature": 0.2,
	})

	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(requestBody))
	if err != nil {
		return LLMResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return LLMResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return LLMResult{}, fmt.Errorf("openai request failed (%d): %s", resp.StatusCode, string(body))
	}

	var data struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return LLMResult{}, err
	}
	if len(data.Choices) == 0 {
		return LLMResult{}, fmt.Errorf("openai response contained no choices")
	}

	return LLMResult{
		Content: strings.TrimSpace(data.Choices[0].Message.Content),
		Usage: &LLMUsage{
			PromptTokens:     data.Usage.PromptTokens,
			CompletionTokens: data.Usage.CompletionTokens,
			TotalTokens:      data.Usage.TotalTokens,
		},
	}, nil
}

func generateAnthropicText(apiKey, model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {

	anthropicMessages := make([]map[string]string, 0, len(messages))
	for _, message := range messages {
		role := message.Role
		if role == "system" {
			role = "user"
		}
		anthropicMessages = append(anthropicMessages, map[string]string{
			"role":    role,
			"content": message.Content,
		})
	}

	requestBody, _ := json.Marshal(map[string]interface{}{
		"model":      model,
		"system":     systemPrompt,
		"max_tokens": 1200,
		"messages":   anthropicMessages,
	})

	req, err := http.NewRequest(http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(requestBody))
	if err != nil {
		return LLMResult{}, err
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return LLMResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return LLMResult{}, fmt.Errorf("anthropic request failed (%d): %s", resp.StatusCode, string(body))
	}

	var data struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return LLMResult{}, err
	}
	if len(data.Content) == 0 {
		return LLMResult{}, fmt.Errorf("anthropic response contained no content")
	}

	contentParts := make([]string, 0, len(data.Content))
	for _, part := range data.Content {
		if strings.TrimSpace(part.Text) != "" {
			contentParts = append(contentParts, part.Text)
		}
	}

	return LLMResult{
		Content: strings.TrimSpace(strings.Join(contentParts, "\n")),
		Usage: &LLMUsage{
			PromptTokens:     data.Usage.InputTokens,
			CompletionTokens: data.Usage.OutputTokens,
			TotalTokens:      data.Usage.InputTokens + data.Usage.OutputTokens,
		},
	}, nil
}

func generateGeminiText(apiKey, model, systemPrompt string, messages []LLMMessage) (LLMResult, error) {

	type part struct {
		Text string `json:"text"`
	}
	type content struct {
		Role  string `json:"role,omitempty"`
		Parts []part `json:"parts"`
	}

	contents := make([]content, 0, len(messages))
	for _, message := range messages {
		role := "user"
		if message.Role == "assistant" {
			role = "model"
		}
		contents = append(contents, content{
			Role:  role,
			Parts: []part{{Text: message.Content}},
		})
	}

	request := map[string]interface{}{
		"contents": contents,
	}
	if strings.TrimSpace(systemPrompt) != "" {
		request["systemInstruction"] = map[string]interface{}{
			"parts": []map[string]string{{"text": systemPrompt}},
		}
	}

	requestBody, _ := json.Marshal(request)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(requestBody))
	if err != nil {
		return LLMResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return LLMResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return LLMResult{}, fmt.Errorf("gemini request failed (%d): %s", resp.StatusCode, string(body))
	}

	var data struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
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
	if len(data.Candidates) == 0 {
		return LLMResult{}, fmt.Errorf("gemini response contained no candidates")
	}

	parts := data.Candidates[0].Content.Parts
	contentParts := make([]string, 0, len(parts))
	for _, part := range parts {
		if strings.TrimSpace(part.Text) != "" {
			contentParts = append(contentParts, part.Text)
		}
	}

	return LLMResult{
		Content: strings.TrimSpace(strings.Join(contentParts, "\n")),
		Usage: &LLMUsage{
			PromptTokens:     data.UsageMetadata.PromptTokenCount,
			CompletionTokens: data.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      data.UsageMetadata.TotalTokenCount,
		},
	}, nil
}
