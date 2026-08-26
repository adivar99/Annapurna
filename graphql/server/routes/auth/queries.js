/**
 * GraphQL Query Strings for Database Operations
 */

function Queries() {
  // User Queries
  const CHECK_USER_EXISTS = `
    query CheckUser($email: String!, $username: String) {
      users(where: {_or: [{email: {_eq: $email}}, {username: {_eq: $username}}]}) {
        id
        email
        username
      }
    }
  `;

  const FIND_USER_BY_EMAIL_OR_USERNAME = `
    query LoginUser($login: String!) {
      users(where: {_or: [{email: {_eq: $login}}, {username: {_eq: $login}}]}) {
        id
        name
        email
        username
        hashed_password
        image_url
        created_at
        updated_at
      }
    }
  `;

  const GET_USER_BY_ID = `
    query GetUserById($userId: uuid!) {
      users_by_pk(id: $userId) {
        id
        name
        email
        username
        image_url
        created_at
        updated_at
        saved_recipes {
          recipe_id
        }
      }
    }
  `;

  // Recipe Queries
  const GET_ALL_RECIPES = `
    query GetAllRecipes($limit: Int, $offset: Int) {
      recipes(limit: $limit, offset: $offset, order_by: {created_at: desc}) {
        id
        title
        description
        ingredients
        instructions
        prep_time
        cook_time
        servings
        difficulty
        cuisine
        tags
        image_url
        author_id
        created_at
        updated_at
      }
    }
  `;

  const GET_RECIPE_BY_ID = `
    query GetRecipeById($recipeId: uuid!) {
      recipes_by_pk(id: $recipeId) {
        id
        title
        description
        ingredients
        instructions
        prep_time
        cook_time
        servings
        difficulty
        cuisine
        tags
        image_url
        author_id
        created_at
        updated_at
      }
    }
  `;

  const SEARCH_RECIPES = `
    query SearchRecipes($searchTerm: String!, $limit: Int, $offset: Int) {
      recipes(
        where: {
          _or: [
            {title: {_ilike: $searchTerm}},
            {description: {_ilike: $searchTerm}}
          ]
        },
        limit: $limit,
        offset: $offset,
        order_by: {created_at: desc}
      ) {
        id
        title
        description
        ingredients
        instructions
        prep_time
        cook_time
        servings
        difficulty
        cuisine
        tags
        image_url
        author_id
        created_at
        updated_at
      }
    }
  `;

  // Saved Recipes Queries
  const GET_USER_SAVED_RECIPES = `
    query GetUserSavedRecipes($userId: uuid!, $limit: Int, $offset: Int) {
      saved_recipes(
        where: {user_id: {_eq: $userId}},
        limit: $limit,
        offset: $offset,
        order_by: {saved_at: desc}
      ) {
        id
        saved_at
        recipe {
          id
          title
          description
          ingredients
          instructions
          prep_time
          cook_time
          servings
          difficulty
          cuisine
          tags
          image_url
          author_id
          created_at
          updated_at
        }
      }
    }
  `;

  const GET_USER_SAVED_RECIPE_IDS = `
    query GetUserSavedRecipeIds($userId: uuid!) {
      saved_recipes(where: {user_id: {_eq: $userId}}) {
        recipe_id
      }
    }
  `;

  const CHECK_RECIPE_SAVED = `
    query CheckRecipeSaved($userId: uuid!, $recipeId: uuid!) {
      saved_recipes(where: {user_id: {_eq: $userId}, recipe_id: {_eq: $recipeId}}) {
        id
      }
    }
  `;

  // Chat Queries
  const GET_USER_CHAT_SESSIONS = `
    query GetUserChatSessions($userId: uuid!) {
      chat_sessions(
        where: {user_id: {_eq: $userId}},
        order_by: {updated_at: desc}
      ) {
        id
        recipe_id
        created_at
        updated_at
        recipe {
          id
          title
          image_url
        }
        messages(order_by: {created_at: desc}, limit: 1) {
          id
          sender
          text
          created_at
        }
      }
    }
  `;

  const GET_CHAT_SESSION_BY_ID = `
    query GetChatSessionById($sessionId: uuid!) {
      chat_sessions_by_pk(id: $sessionId) {
        id
        user_id
        recipe_id
        created_at
        updated_at
        recipe {
          id
          title
          description
          ingredients
          instructions
          prep_time
          cook_time
          servings
          difficulty
          cuisine
          tags
          image_url
        }
        messages(order_by: {created_at: asc}) {
          id
          sender
          text
          created_at
        }
      }
    }
  `;

  const GET_CHAT_SESSION_BY_RECIPE = `
    query GetChatSessionByRecipe($userId: uuid!, $recipeId: uuid!) {
      chat_sessions(
        where: {user_id: {_eq: $userId}, recipe_id: {_eq: $recipeId}},
        order_by: {updated_at: desc},
        limit: 1
      ) {
        id
        user_id
        recipe_id
        created_at
        updated_at
        messages(order_by: {created_at: asc}) {
          id
          sender
          text
          created_at
        }
      }
    }
  `;

  return {
    CHECK_USER_EXISTS,
    FIND_USER_BY_EMAIL_OR_USERNAME,
    GET_USER_BY_ID,
    GET_ALL_RECIPES,
    GET_RECIPE_BY_ID,
    SEARCH_RECIPES,
    GET_USER_SAVED_RECIPES,
    GET_USER_SAVED_RECIPPE_IDS: GET_USER_SAVED_RECIPE_IDS,
    CHECK_RECIPE_SAVED,
    GET_USER_CHAT_SESSIONS,
    GET_CHAT_SESSION_BY_ID,
    GET_CHAT_SESSION_BY_RECIPE
  };
}

module.exports = Queries();
