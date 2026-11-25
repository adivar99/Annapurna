package ai

import (
	"fmt"
	"regexp"
	"strings"
)

// mockSentinel is the placeholder API key the Node code treated as "no key".
const mockSentinel = "awelfkjwoeigjfnwef"

// IsMockKey reports whether AI endpoints should answer from offline fixtures
// instead of calling OpenAI.
func IsMockKey(key string) bool {
	return key == "" || key == mockSentinel
}

var leadingHashes = regexp.MustCompile(`^#*\s*`)

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

// MockParse returns the canned parsed recipe; the title is the first line of
// the input with leading hashes/whitespace stripped and capped at 100 chars —
// byte-for-byte the Node fallback heuristic (no extra trimming).
func MockParse(rawText string) map[string]any {
	firstLine := rawText
	if i := strings.Index(rawText, "\n"); i >= 0 {
		firstLine = rawText[:i]
	}
	title := leadingHashes.ReplaceAllString(firstLine, "")
	title = truncate(title, 100)
	if title == "" {
		title = "Parsed Recipe"
	}
	return map[string]any{
		"title":       title,
		"description": "Parsed from text",
		"ingredients": []map[string]any{
			{"name": "Flour", "quantity": float64(2), "unit": "cups", "notes": ""},
			{"name": "Sugar", "quantity": float64(1), "unit": "cup", "notes": ""},
		},
		"instructions": []string{
			"Preheat oven to 350°F (175°C).",
			"Mix all ingredients in a large bowl.",
			"Bake for 25-30 minutes until golden.",
		},
		"prep_time":  15,
		"cook_time":  30,
		"servings":   4,
		"difficulty": "easy",
		"cuisine":    "general",
		"tags":       []string{"quick", "baking"},
	}
}

// MockAskReply is the canned cooking-assistant answer.
func MockAskReply(title string) string {
	return fmt.Sprintf(
		`As your cooking assistant for "%s", here is a helpful tip: Make sure to season each component to taste! Let me know if you need any ingredient substitutions.`,
		title,
	)
}

// MockAnalysis is the canned recipe analysis.
const MockAnalysis = "This recipe is well balanced with great flavors."

// MockClientSecret is returned by /ai/realtime/session without a real key.
const MockClientSecret = "mock_client_secret_token"
