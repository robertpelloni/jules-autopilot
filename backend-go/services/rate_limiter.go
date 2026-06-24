package services

import (
	"sync"
	"time"
)

// RateLimiter is a simple per-key sliding window rate limiter.
type RateLimiter struct {
	mu      sync.Mutex
	windows map[string]*slidingWindow
	rate    int
	window  time.Duration
}

type slidingWindow struct {
	timestamps []time.Time
}

var (
	globalRateLimiter *RateLimiter
	rateLimiterOnce   sync.Once
)

// InitRateLimiter initializes the global rate limiter (5 requests per second per session).
func InitRateLimiter() {
	rateLimiterOnce.Do(func() {
		globalRateLimiter = &RateLimiter{
			windows: make(map[string]*slidingWindow),
			rate:    5,
			window:  time.Second,
		}
	})
}

// GetRateLimiter returns the global rate limiter instance.
func GetRateLimiter() *RateLimiter {
	if globalRateLimiter == nil {
		InitRateLimiter()
	}
	return globalRateLimiter
}

// Allow checks if a request for the given key should be allowed.
// Returns true if the request is within the rate limit.
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	sw, exists := rl.windows[key]
	if !exists {
		rl.windows[key] = &slidingWindow{
			timestamps: []time.Time{now},
		}
		return true
	}

	// Remove old timestamps outside the window
	cutoff := now.Add(-rl.window)
	var valid []time.Time
	for _, t := range sw.timestamps {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	sw.timestamps = valid

	// Check if under rate limit
	if len(valid) >= rl.rate {
		return false
	}

	sw.timestamps = append(sw.timestamps, now)
	return true
}
