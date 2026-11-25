package store

import (
	"context"

	"github.com/adivar99/annapurna-server/internal/hasura"
)

// Users covers the users table operations.
type Users struct {
	client *hasura.Client
}

func NewUsers(client *hasura.Client) *Users { return &Users{client: client} }

// ExistsByEmailOrUsername reports whether any user already has the email or
// username.
func (u *Users) ExistsByEmailOrUsername(ctx context.Context, email, username string) (bool, error) {
	var out struct {
		Users []struct {
			ID       string `json:"id"`
			Email    string `json:"email"`
			Username string `json:"username"`
		} `json:"users"`
	}
	err := u.client.Exec(ctx, hasura.CheckUserExistsOp, map[string]any{
		"email":    email,
		"username": username,
	}, &out)
	return len(out.Users) > 0, err
}

// FindByLogin looks a user up by email OR username (whichever matches).
func (u *Users) FindByLogin(ctx context.Context, login string) (*User, error) {
	var out struct {
		Users []User `json:"users"`
	}
	err := u.client.Exec(ctx, hasura.FindUserByEmailOrUsernameOp, map[string]any{"login": login}, &out)
	if err != nil {
		return nil, err
	}
	if len(out.Users) == 0 {
		return nil, nil
	}
	return &out.Users[0], nil
}

// GetByID fetches a user with their saved-recipe references, or nil.
func (u *Users) GetByID(ctx context.Context, userID string) (*User, error) {
	var out struct {
		User *User `json:"users_by_pk"`
	}
	err := u.client.Exec(ctx, hasura.GetUserByIdOp, map[string]any{"userId": userID}, &out)
	if err != nil || out.User == nil {
		return nil, err
	}
	return out.User, nil
}

// Create inserts a user. userData keys follow Hasura's users_insert_input
// (snake_case columns); a nil image_url value marshals as SQL NULL.
func (u *Users) Create(ctx context.Context, userData map[string]any) (*User, error) {
	var out struct {
		User User `json:"insert_users_one"`
	}
	err := u.client.Exec(ctx, hasura.CreateUserOp, map[string]any{"userData": userData}, &out)
	if err != nil {
		return nil, err
	}
	return &out.User, nil
}
