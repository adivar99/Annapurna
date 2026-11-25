package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

const testSecret = "unit-test-secret"

func newTestSigner(t *testing.T) *Signer {
	t.Helper()
	s, err := NewSigner(testSecret, "24h")
	require.NoError(t, err)
	return s
}

func TestGenerate_ParseRoundTrip(t *testing.T) {
	s := newTestSigner(t)

	token, err := s.Generate("abc-123", "chef@example.com")
	require.NoError(t, err)
	require.Equal(t, "24h", token.ExpiresIn)

	identity, err := s.Parse(token.Value)
	require.NoError(t, err)
	require.Equal(t, "abc-123", identity.UserID)
}

func TestGenerate_HasuraClaimShape(t *testing.T) {
	s := newTestSigner(t)

	token, err := s.Generate("abc-123", "chef@example.com")
	require.NoError(t, err)

	parsed, err := jwt.Parse(token.Value, func(*jwt.Token) (any, error) { return []byte(testSecret), nil })
	require.NoError(t, err)
	claims, ok := parsed.Claims.(jwt.MapClaims)
	require.True(t, ok)

	hasura, ok := claims["https://hasura.io/jwt/claims"].(map[string]any)
	require.True(t, ok, "namespaced hasura claims block missing")
	require.Equal(t, "user", hasura["x-hasura-default-role"])
	require.Equal(t, "abc-123", hasura["x-hasura-user-id"], "user id must be a string for Hasura")
	require.ElementsMatch(t, []any{"user", "public"}, hasura["x-hasura-allowed-roles"])
	require.Equal(t, "chef@example.com", claims["email"])

	exp, ok := claims["exp"].(float64)
	require.True(t, ok, "exp claim missing")
	require.InDelta(t, time.Now().Add(24*time.Hour).Unix(), exp, 60)
}

func TestParse_RejectsBadTokens(t *testing.T) {
	s := newTestSigner(t)

	t.Run("wrong signature", func(t *testing.T) {
		token, err := s.Generate("abc-123", "x@y.z")
		require.NoError(t, err)
		forged := token.Value[:len(token.Value)-3] + "zzz"
		_, err = s.Parse(forged)
		require.ErrorIs(t, err, ErrInvalidToken)
	})

	t.Run("no hasura claims", func(t *testing.T) {
		bare := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub": "someone", "exp": time.Now().Add(time.Hour).Unix(),
		})
		signed, err := bare.SignedString([]byte(testSecret))
		require.NoError(t, err)
		_, err = s.Parse(signed)
		require.ErrorIs(t, err, ErrInvalidToken)
	})

	t.Run("non-HS256 algorithm rejected", func(t *testing.T) {
		// alg=none tokens carry no signature segment.
		token := jwt.NewWithClaims(jwt.SigningMethodNone, jwt.MapClaims{
			"https://hasura.io/jwt/claims": map[string]any{"x-hasura-user-id": "1"},
			"exp":                          time.Now().Add(time.Hour).Unix(),
		})
		signed, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
		require.NoError(t, err)
		require.True(t, strings.HasSuffix(signed, "."))
		_, err = s.Parse(signed)
		require.ErrorIs(t, err, ErrInvalidToken)
	})
}
