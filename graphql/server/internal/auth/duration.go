// Package auth holds the crypto helpers the API depends on: password hashing,
// JWT minting/verification, and token-lifetime parsing.
package auth

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// DefaultTokenTTL is used when JWT_EXPIRES_IN is unset or unparsable.
const DefaultTokenTTL = 24 * time.Hour

// ParseDuration understands the token-lifetime formats the server accepts:
// Go-style units ("24h", "30m"), day suffixes ("7d"), and bare numbers, which
// are interpreted as SECONDS.
//
// Deviation from Node: jsonwebtoken treated bare numbers as milliseconds;
// nothing ever relied on that form, and seconds is the less surprising choice.
func ParseDuration(s string) (time.Duration, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return DefaultTokenTTL, nil
	}
	if d, err := time.ParseDuration(s); err == nil {
		return d, nil
	}
	lower := strings.ToLower(s)
	if strings.HasSuffix(lower, "d") {
		if n, err := strconv.ParseFloat(strings.TrimSuffix(lower, "d"), 64); err == nil {
			return time.Duration(n * float64(24*time.Hour)), nil
		}
	}
	if n, err := strconv.ParseInt(s, 10, 64); err == nil {
		return time.Duration(n) * time.Second, nil
	}
	return 0, fmt.Errorf("invalid duration %q", s)
}
