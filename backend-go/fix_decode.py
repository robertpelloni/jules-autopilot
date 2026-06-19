with open("services/llm.go", "r") as f:
    content = f.read()

# Find the stub
idx = content.find("// decodeOpenRouterResponse")
if idx < 0:
    idx = content.find("func decodeOpenRouterResponse")
    if idx < 0:
        print("ERROR: not found")
        exit(1)

# Find next function after it
next_func = content.find("func generateOpenRouterText", idx)
if next_func < 0:
    print("ERROR: next func not found")
    exit(1)

new_func = """func decodeOpenRouterResponse(resp *http.Response, start time.Time) (LLMResult, error) {
\tvar data struct {
\t\tChoices []struct {
\t\t\tMessage struct {
\t\t\t\tContent          string \x60json:"content"\x60
\t\t\t\tReasoningContent string \x60json:"reasoning_content"\x60
\t\t\t\tReasoning        string \x60json:"reasoning"\x60
\t\t\t} \x60json:"message"\x60
\t\t} \x60json:"choices"\x60
\t\tUsage struct {
\t\t\tPromptTokens     int \x60json:"prompt_tokens"\x60
\t\t\tCompletionTokens int \x60json:"completion_tokens"\x60
\t\t\tTotalTokens      int \x60json:"total_tokens"\x60
\t\t} \x60json:"usage"\x60
\t}
\tif err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
\t\tresp.Body.Close()
\t\treturn LLMResult{}, err
\t}
\tresp.Body.Close()
\tif len(data.Choices) == 0 {
\t\treturn LLMResult{}, fmt.Errorf("LLM response contained no choices")
\t}
\t// Use content field, fall back to reasoning_content then reasoning for reasoning models
\tresultContent := strings.TrimSpace(data.Choices[0].Message.Content)
\tif resultContent == "" {
\t\tresultContent = strings.TrimSpace(data.Choices[0].Message.ReasoningContent)
\t}
\tif resultContent == "" {
\t\tresultContent = strings.TrimSpace(data.Choices[0].Message.Reasoning)
\t}
\tif resultContent == "" {
\t\treturn LLMResult{}, fmt.Errorf("LLM returned empty content (finish_reason may be length)")
\t}
\treturn LLMResult{
\t\tContent:   resultContent,
\t\tLatencyMs: float64(time.Since(start).Milliseconds()),
\t\tUsage: &LLMUsage{
\t\t\tPromptTokens:     data.Usage.PromptTokens,
\t\t\tCompletionTokens: data.Usage.CompletionTokens,
\t\t\tTotalTokens:      data.Usage.TotalTokens,
\t\t},
\t}, nil
}
"""

before = content[:idx]
# Find the actual end of the broken function (the last close brace before generateOpenRouterText)
after = content[next_func:]

content = before + new_func + "\n" + after

with open("services/llm.go", "w") as f:
    f.write(content)

print(f"Replaced at index {idx}")
