package auth

import "golang.org/x/crypto/bcrypt"

// hashCost matches the Node server (bcryptjs, cost 12). bcryptjs emits `$2a$`
// hashes, which golang.org/x/crypto/bcrypt reads and writes interchangeably.
const hashCost = 12

// HashPassword hashes a plaintext password with bcrypt.
func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), hashCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// ComparePassword reports whether the plaintext matches a stored bcrypt hash.
func ComparePassword(hashed, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(password)) == nil
}
