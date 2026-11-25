package hasura

// GraphQL mutation documents, copied verbatim from the Node server's
// routes/auth/mutations.js. UPDATE_USER and UPDATE_USER_PASSWORD were dropped:
// no route ever called them (dead code).

const CreateUserOp = `
    mutation CreateUser($userData: users_insert_input!) {
      insert_users_one(object: $userData) {
        id
        name
        email
        username
        image_url
        created_at
        updated_at
      }
    }
  `

const CreateRecipeOp = `
    mutation CreateRecipe($recipeData: recipes_insert_input!) {
      insert_recipes_one(object: $recipeData) {
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

const UpdateRecipeOp = `
    mutation UpdateRecipe($recipeId: uuid!, $recipeData: recipes_set_input!) {
      update_recipes_by_pk(pk_columns: {id: $recipeId}, _set: $recipeData) {
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
        updated_at
      }
    }
  `

const DeleteRecipeOp = `
    mutation DeleteRecipe($recipeId: uuid!) {
      delete_recipes_by_pk(id: $recipeId) {
        id
      }
    }
  `

const SaveRecipeOp = `
    mutation SaveRecipe($userId: uuid!, $recipeId: uuid!) {
      insert_saved_recipes_one(object: {user_id: $userId, recipe_id: $recipeId}) {
        id
        user_id
        recipe_id
        saved_at
      }
    }
  `

const UnsaveRecipeOp = `
    mutation UnsaveRecipe($userId: uuid!, $recipeId: uuid!) {
      delete_saved_recipes(where: {user_id: {_eq: $userId}, recipe_id: {_eq: $recipeId}}) {
        affected_rows
      }
    }
  `

const CreateChatSessionOp = `
    mutation CreateChatSession($object: chat_sessions_insert_input!) {
      insert_chat_sessions_one(object: $object) {
        id
        user_id
        recipe_id
        created_at
        updated_at
      }
    }
  `

const DeleteChatSessionOp = `
    mutation DeleteChatSession($sessionId: uuid!) {
      delete_chat_sessions_by_pk(id: $sessionId) {
        id
      }
    }
  `

const AddChatMessageOp = `
    mutation AddChatMessage($object: chat_messages_insert_input!) {
      insert_chat_messages_one(object: $object) {
        id
        session_id
        sender
        text
        created_at
      }
    }
  `
