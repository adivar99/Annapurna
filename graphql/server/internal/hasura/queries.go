package hasura

// GraphQL query documents, copied verbatim from the Node server's
// routes/auth/queries.js so Hasura sees identical operations. Only dead
// queries (never called by any route) were dropped.

const CheckUserExistsOp = `
    query CheckUser($email: String!, $username: String) {
      users(where: {_or: [{email: {_eq: $email}}, {username: {_eq: $username}}]}) {
        id
        email
        username
      }
    }
  `

const FindUserByEmailOrUsernameOp = `
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
  `

const GetUserByIdOp = `
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
  `

const GetAllRecipesOp = `
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
  `

const GetRecipeByIdOp = `
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
  `

const SearchRecipesOp = `
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
  `

const GetUserSavedRecipesOp = `
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
  `

const GetUserSavedRecipeIdsOp = `
    query GetUserSavedRecipeIds($userId: uuid!) {
      saved_recipes(where: {user_id: {_eq: $userId}}) {
        recipe_id
      }
    }
  `

const GetUserChatSessionsOp = `
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
  `

const GetChatSessionByIdOp = `
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
  `

const GetChatSessionByRecipeOp = `
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
  `
