filepath = 'backend-go/services/llm.go'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''	log.Printf("[LLM] Sending request to %s (model: %s)", apiURL, model)
	resp, err := llmHttpClient.Do(req)
	if err != nil {
		return LLMResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return LLMResult{}, fmt.Errorf("LLM request to %s failed (%d): %s", apiURL, resp.StatusCode, string(body))
	}

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
		return LLMResult{}, err
	}
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
}'''

new = '''	log.Printf("[LLM] Sending request to %s (model: %s)", apiURL, model)

	// Retry logic for LM Studio "Model unloaded" errors (model needs time to reload)
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
}'''

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Applied LM Studio retry logic")
elif old.replace('\n', '\r\n') in content:
    content = content.replace(old.replace('\n', '\r\n'), new.replace('\n', '\r\n'), 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Applied LM Studio retry logic (CRLF)")
else:
    print("ERROR: Pattern not found")
    # Debug
    idx = content.find('Sending request to %s')
    if idx >= 0:
        print(f"Found at offset {idx}")
        print(repr(content[idx-30:idx+150]))
