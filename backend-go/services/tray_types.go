package services

// TraySummary is the data the tray polls to display live activity.
type TraySummary struct {
	Status         string         `json:"status"`
	PendingJobs    int            `json:"pendingJobs"`
	ProcessingJobs int            `json:"processingJobs"`
	NudgesLast5m   int            `json:"nudgesLast5m"`
	FailuresLast5m int            `json:"failuresLast5m"`
	SessionsByRaw  map[string]int `json:"sessionsByRaw"`
	Events         []TrayEvent    `json:"events"`
}

// TrayEvent is a single event shown in the tray log window.
type TrayEvent struct {
	Time    string `json:"time"`
	Type    string `json:"type"`
	Message string `json:"message"`
}
