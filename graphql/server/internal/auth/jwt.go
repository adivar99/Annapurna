package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// hasuraClaimsKey is the namespaced claim block Hasura reads permissions from.
const hasuraClaimsKey = "https://hasura.io/jwt/claims"

// ErrInvalidToken is returned for any token that fails verification or is
// missing the Hasura claims block.
var ErrInvalidToken = errors.New("invalid or expired token")

// Signer mints the HS256 tokens Hasura consumes. Secret MUST byte-match the
// `key` inside HASURA_GRAPHQL_JWT_SECRET, or Hasura rejects every token.
type Signer struct {
	Secret    []byte
	ExpiresIn string // raw config string, echoed back to clients as expires_in
	ttl       time.Duration
}

// NewSigner validates the configured lifetime up front.
func NewSigner(secret, expiresIn string) (*Signer, error) {
	ttl, err := ParseDuration(expiresIn)
	if err != nil {
		return nil, err
	}
	return &Signer{Secret: []byte(secret), ExpiresIn: expiresIn, ttl: ttl}, nil
}

// Token is a signed JWT plus the raw lifetime string clients expect.
type Token struct {
	Value     string
	ExpiresIn string
}

// Generate signs a token carrying the exact claim structure the Hasura
// permission rules depend on. userID is the string form of users.id.
func (s *Signer) Generate(userID, email string) (Token, error) {
	claims := jwt.MapClaims{
		"id":    userID,
		"email": email,
		hasuraClaimsKey: map[string]any{
			"x-hasura-default-role":  "user",
			"x-hasura-allowed-roles": []string{"user", "public"},
			"x-hasura-user-id":       userID,
		},
		"exp": time.Now().Add(s.ttl).Unix(),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.Secret)
	if err != nil {
		return Token{}, err
	}
	return Token{Value: signed, ExpiresIn: s.ExpiresIn}, nil
}

// Identity is what the auth middleware extracts from a bearer token.
type Identity struct {
	UserID string
}

// Parse verifies signature and algorithm, then pulls the user id out of the
// Hasura claims block. Tokens without usable claims are rejected.
func (s *Signer) Parse(tokenString string) (Identity, error) {
	var identity Identity

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
		return s.Secret, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !token.Valid {
		return identity, ErrInvalidToken
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return identity, ErrInvalidToken
	}
	hasura, ok := claims[hasuraClaimsKey].(map[string]any)
	if !ok {
		return identity, ErrInvalidToken
	}
	userID, _ := hasura["x-hasura-user-id"].(string)
	if userID == "" {
		return identity, ErrInvalidToken
	}
	return Identity{UserID: userID}, nil
}
