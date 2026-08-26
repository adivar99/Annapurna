/**
2	 * GraphQL Mutation Strings for Database Operations
3	 */

function Mutations() {
  const CREATE_USER = `
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
  `;

  const UPDATE_USER = `
    mutation UpdateUser($userId: uuid!, $userData: users_set_input!) {
      update_users_by_pk(pk_columns: {id: $userId}, _set: $userData) {
        id
        name
        email
        username
        image_url
        updated_at
      }
    }
  `;

  const UPDATE_USER_PASSWORD = `
    mutation UpdateUserPassword($userId: uuid!, $hashedPassword: String!) {
      update_users_by_pk(pk_columns: {id: $userId}, _set: {hashed_password: $hashedPassword}) {
        id
        updated_at
      }
    }
  `;

  const CREATE_RECIPE = `
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
  `;

  const UPDATE_RECIPE = `
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
  `;

  const DELETE_RECIPE = `
    mutation DeleteRecipe($recipeId: uuid!) {
      delete_recipes_by_pk(id: $recipeId) {
        id
      }
    }
  `;

  const SAVE_RECIPE = `
    mutation SaveRecipe($userId: uuid!, $recipeId: uuid!) {
      insert_saved_recipes_one(object: {user_id: $userId, recipe_id: $recipeId}) {
        id
        user_id
        recipe_id
        saved_at
      }
    }
  `;

  const UNSAVE_RECIPE = `
    mutation UnsaveRecipe($userId: uuid!, $recipeId: uuid!) {
      delete_saved_recipes(where: {user_id: {_eq: $userId}, recipe_id: {_eq: $recipeId}}) {
        affected_rows
      }
    }
  `;

  const CREATE_CHAT_SESSION = `
    mutation CreateChatSession($object: chat_sessions_insert_input!) {
      insert_chat_sessions_one(object: $object) {
        id
        user_id
        recipe_id
        created_at
        updated_at
      }
    }
  `;

  const DELETE_CHAT_SESSION = `
    mutation DeleteChatSession($sessionId: uuid!) {
      delete_chat_sessions_by_pk(id: $sessionId) {
        id
      }
    }
  `;

  const ADD_CHAT_MESSAGE = `
    mutation AddChatMessage($object: chat_messages_insert_input!) {
      insert_chat_messages_one(object: $object) {
        id
        session_id
        sender
        text
        created_at
      }
    }
  `;

  return {
    CREATE_USER,
    UPDATE_USER,
    UPDATE_USER_PASSWORD,
    CREATE_RECIPE,
    UPDATE_RECIPE,
    DELETE_RECIPE,
    SAVE_RECIPE,
    UNSAVE_RECIPE,
    CREATE_CHAT_SESSION,
    DELETE_CHAT_SESSION,
    ADD_CHAT_MESSAGE
  };
}

module.exports = Mutations();
