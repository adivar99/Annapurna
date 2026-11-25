package hasura

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestExec_PostsDocumentAndVariables verifies the wire contract: the exact
// GraphQL document goes out, variables marshal, and the admin-secret header
// is present.
func TestExec_PostsDocumentAndVariables(t *testing.T) {
	var (
		gotAuth  string
		gotQuery string
		gotVars  map[string]any
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("x-hasura-admin-secret")
		require.Equal(t, http.MethodPost, r.Method)

		var body struct {
			Query     string          `json:"query"`
			Variables json.RawMessage `json:"variables"`
		}
		require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
		gotQuery = body.Query
		if len(body.Variables) > 0 {
			require.NoError(t, json.Unmarshal(body.Variables, &gotVars))
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"recipes":[{"id":"r1","title":"Soup"}]}}`))
	}))
	defer srv.Close()

	client := NewClient(srv.URL, "test-admin-secret", srv.Client())

	var out struct {
		Recipes []struct {
			ID    string `json:"id"`
			Title string `json:"title"`
		} `json:"recipes"`
	}
	err := client.Exec(context.Background(), GetAllRecipesOp,
		map[string]any{"limit": 3, "offset": 9}, &out)
	require.NoError(t, err)
	require.Equal(t, "test-admin-secret", gotAuth)
	require.Equal(t, GetAllRecipesOp, gotQuery)
	require.InDelta(t, 3, gotVars["limit"], 0)
	require.InDelta(t, 9, gotVars["offset"], 0)
	require.Len(t, out.Recipes, 1)
	require.Equal(t, "Soup", out.Recipes[0].Title)
}

func TestExec_GraphQLErrorBecomesSentinelError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"errors":[{"message":"first failure"},{"message":"second"}]}`))
	}))
	defer srv.Close()

	client := NewClient(srv.URL, "secret", srv.Client())
	err := client.Exec(context.Background(), CheckUserExistsOp, nil, nil)
	require.Error(t, err)
	hErr := &Error{}
	require.ErrorAs(t, err, &hErr)
	require.Equal(t, "first failure", hErr.Message)
}

func TestOperationName(t *testing.T) {
	require.Equal(t, "GetAllRecipes", operationName("query GetAllRecipes($limit: Int) {"))
	require.Equal(t, "CreateUser", operationName("\n    mutation CreateUser($x: y!) {"))
	require.Equal(t, "unknown", operationName("nonsense"))
}
