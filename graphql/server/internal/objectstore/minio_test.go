package objectstore

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// TestUserFolder_Parity pins the folder scheme to a known sha256 value so
// existing MinIO keys stay resolvable across the migration. The Node code was
// crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16).
func TestUserFolder_Parity(t *testing.T) {
	// sha256("test") = 9f86d081884c7d659a2feaa0c55ad015...
	// First 16 hex chars = the first 8 bytes.
	require.Equal(t, "9f86d081884c7d65", UserFolder("test"))

	long := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
	require.Len(t, UserFolder(long), 16)
}

func TestSanitizedExt(t *testing.T) {
	cases := map[string]string{
		"photo.JPG":       "JPG",
		"archive.tar.gz":  "gz",
		"noext":           "noext", // split('.').pop() yields the whole name
		"file.":           "bin",   // empty after the trailing dot
		"recipe file.txt": "txt",
		"a.b#$/name.txt":  "txt",
		"x.abcdefghijkl":  "abcdefgh", // clamped to 8 alphanumerics (hardening beyond the JS)
	}
	for in, want := range cases {
		require.Equal(t, want, sanitizedExt(in), in)
	}
}
