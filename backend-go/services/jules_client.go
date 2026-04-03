package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/jules-autopilot/backend/models"
)

const JulesApiBaseUrl = "https://jules.googleapis.com/v1alpha"

// JulesClient represents a client for the Google Jules API
type JulesClient struct {
	apiKey string
}

// NewJulesClient creates a new instance of JulesClient
func NewJulesClient() *JulesClient {
	// Attempt to load .env from the root if JULES_API_KEY is not set
	if os.Getenv("JULES_API_KEY") == "" {
		_ = godotenv.Load("../.env")
	}

	return &JulesClient{
		apiKey: os.Getenv("JULES_API_KEY"),
	}
}

// ApiSession is the raw response structure from the Jules API
type ApiSession struct {
	ID            string `json:"id"`
	SourceContext *struct {
		Source            *string `json:"source"`
		GithubRepoContext *struct {
			StartingBranch *string `json:"startingBranch"`
		} `json:"githubRepoContext"`
	} `json:"sourceContext"`
	Title          *string            `json:"title"`
	State          *string            `json:"state"`
	CreateTime     string             `json:"createTime"`
	UpdateTime     string             `json:"updateTime"`
	LastActivityAt *string            `json:"lastActivityAt"`
	Outputs        []ApiSessionOutput `json:"outputs"`
}

type ApiSessionOutput struct {
	PullRequest *struct {
		URL         string `json:"url"`
		Title       string `json:"title"`
		Description string `json:"description"`
	} `json:"pullRequest"`
}

// ListSessions fetches all sessions from the Jules API
func (c *JulesClient) ListSessions() ([]models.JulesSession, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("JULES_API_KEY not found in environment")
	}

	url := fmt.Sprintf("%s/sessions", JulesApiBaseUrl)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Goog-Api-Key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Jules API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var data struct {
		Sessions []ApiSession `json:"sessions"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	var results []models.JulesSession
	for _, s := range data.Sessions {
		results = append(results, transformSession(s))
	}

	return results, nil
}

// GetSession fetches metadata for a single session
func (c *JulesClient) GetSession(id string) (models.JulesSession, error) {
	if c.apiKey == "" {
		return models.JulesSession{}, fmt.Errorf("JULES_API_KEY not found in environment")
	}

	url := fmt.Sprintf("%s/sessions/%s", JulesApiBaseUrl, id)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return models.JulesSession{}, err
	}

	req.Header.Set("X-Goog-Api-Key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return models.JulesSession{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return models.JulesSession{}, fmt.Errorf("Jules API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var s ApiSession
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		return models.JulesSession{}, err
	}

	return transformSession(s), nil
}

func transformActivity(a map[string]interface{}, sessionId string) models.JulesActivity {
	id, _ := a["id"].(string)
	createTime, _ := a["createTime"].(string)
	createdAt, _ := time.Parse(time.RFC3339, createTime)

	activity := models.JulesActivity{
		ID:        id,
		SessionID: sessionId,
		CreatedAt: createdAt,
		Metadata:  a,
		Role:      "agent",
		Type:      "message",
	}

	// Determine Role and Type
	if _, ok := a["userMessage"]; ok {
		activity.Role = "user"
		if m, ok := a["userMessage"].(map[string]interface{}); ok {
			activity.Content, _ = m["message"].(string)
			if activity.Content == "" {
				activity.Content, _ = m["content"].(string)
			}
		}
	} else if _, ok := a["agentMessaged"]; ok {
		activity.Role = "agent"
		if m, ok := a["agentMessaged"].(map[string]interface{}); ok {
			activity.Content, _ = m["message"].(string)
			if activity.Content == "" {
				activity.Content, _ = m["agentMessage"].(string)
			}
		}
	} else if _, ok := a["planGenerated"]; ok {
		activity.Type = "plan"
		if pg, ok := a["planGenerated"].(map[string]interface{}); ok {
			activity.Content, _ = pg["summary"].(string)
			if activity.Content == "" {
				activity.Content, _ = pg["description"].(string)
			}
		}
	} else if _, ok := a["progressUpdated"]; ok {
		activity.Type = "progress"
		if pu, ok := a["progressUpdated"].(map[string]interface{}); ok {
			activity.Content, _ = pu["progressDescription"].(string)
			if activity.Content == "" {
				activity.Content, _ = pu["message"].(string)
			}

			// Extract artifacts
			if arts, ok := pu["artifacts"].([]interface{}); ok && len(arts) > 0 {
				if first, ok := arts[0].(map[string]interface{}); ok {
					if cs, ok := first["changeSet"].(map[string]interface{}); ok {
						if gp, ok := cs["gitPatch"].(map[string]interface{}); ok {
							activity.Diff, _ = gp["unidiffPatch"].(string)
						}
					}
					if bo, ok := first["bashOutput"].(map[string]interface{}); ok {
						activity.BashOutput, _ = bo["output"].(string)
					}
				}
			}
		}
	} else if _, ok := a["sessionCompleted"]; ok {
		activity.Type = "result"
		if sc, ok := a["sessionCompleted"].(map[string]interface{}); ok {
			activity.Content, _ = sc["summary"].(string)
		}
	}

	if activity.Content == "" {
		activity.Content, _ = a["content"].(string)
		if activity.Content == "" {
			activity.Content, _ = a["text"].(string)
		}
	}

	return activity
}

// ListActivities fetches all activities for a session from the Jules API
func (c *JulesClient) ListActivities(sessionId string) ([]models.JulesActivity, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("JULES_API_KEY not found in environment")
	}

	var allActivities []models.JulesActivity
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/sessions/%s/activities?pageSize=1000", JulesApiBaseUrl, sessionId)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}

		req.Header.Set("X-Goog-Api-Key", c.apiKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("Jules API activities request failed with status %d: %s", resp.StatusCode, string(body))
		}

		var data struct {
			Activities    []map[string]interface{} `json:"activities"`
			NextPageToken string                   `json:"nextPageToken"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			return nil, err
		}

		for _, a := range data.Activities {
			allActivities = append(allActivities, transformActivity(a, sessionId))
		}

		pageToken = data.NextPageToken
		if pageToken == "" {
			break
		}
	}

	return allActivities, nil
}

// CreateActivityRequest defines the payload for creating a session activity
type CreateActivityRequest struct {
	Content string `json:"content"`
	Type    string `json:"type,omitempty"`
	Role    string `json:"role,omitempty"`
}

// CreateActivity sends a message or result to a specific session
func (c *JulesClient) CreateActivity(sessionId string, params CreateActivityRequest) (interface{}, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("JULES_API_KEY not found in environment")
	}

	// Default to sendMessage if type is message or empty
	url := fmt.Sprintf("%s/sessions/%s:sendMessage", JulesApiBaseUrl, sessionId)
	payload := map[string]string{"prompt": params.Content}

	// If it's a result or has a specific role, we might need the activities endpoint
	// But the primary way to "message" is :sendMessage
	if params.Type == "result" {
		url = fmt.Sprintf("%s/sessions/%s/activities", JulesApiBaseUrl, sessionId)
		// For /activities, the structure might be different depending on the API
		// This is a simplified fallback
	}

	jsonPayload, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Goog-Api-Key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("Jules API error (%d): %s", resp.StatusCode, string(body))
	}

	var result interface{}
	json.Unmarshal(body, &result)
	return result, nil
}

func transformSession(s ApiSession) models.JulesSession {
	var outputs []models.JulesSessionOutput
	for _, o := range s.Outputs {
		if o.PullRequest != nil {
			outputs = append(outputs, models.JulesSessionOutput{
				PullRequest: &models.PullRequestInfo{
					URL:         o.PullRequest.URL,
					Title:       o.PullRequest.Title,
					Description: o.PullRequest.Description,
				},
			})
		}
	}

	sourceID := ""
	if s.SourceContext != nil && s.SourceContext.Source != nil {
		sourceID = strings.TrimPrefix(*s.SourceContext.Source, "sources/github/")
	}

	title := ""
	if s.Title != nil {
		title = *s.Title
	}

	rawState := ""
	if s.State != nil {
		rawState = *s.State
	}

	branch := "main"
	if s.SourceContext != nil && s.SourceContext.GithubRepoContext != nil && s.SourceContext.GithubRepoContext.StartingBranch != nil {
		branch = *s.SourceContext.GithubRepoContext.StartingBranch
	}

	createdAt, _ := time.Parse(time.RFC3339, s.CreateTime)
	updatedAt, _ := time.Parse(time.RFC3339, s.UpdateTime)

	var lastActivityAt *time.Time
	if s.LastActivityAt != nil {
		t, err := time.Parse(time.RFC3339, *s.LastActivityAt)
		if err == nil {
			lastActivityAt = &t
		}
	}

	return models.JulesSession{
		ID:             s.ID,
		SourceID:       sourceID,
		Title:          title,
		Status:         mapState(rawState),
		RawState:       rawState,
		Branch:         branch,
		Outputs:        outputs,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
		LastActivityAt: lastActivityAt,
	}
}

func mapState(state string) string {
	stateMap := map[string]string{
		"COMPLETED":              "completed",
		"ACTIVE":                 "active",
		"PLANNING":               "active",
		"QUEUED":                 "active",
		"IN_PROGRESS":            "active",
		"AWAITING_USER_FEEDBACK": "active",
		"AWAITING_PLAN_APPROVAL": "awaiting_approval",
		"FAILED":                 "failed",
		"PAUSED":                 "paused",
	}

	if val, ok := stateMap[state]; ok {
		return val
	}
	return "active"
}
