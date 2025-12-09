/**
 * GraphQL Mutation Strings for Auth Module
 * Contains all write operations (mutations)
 */

function Mutations() {
  const CREATE_USER = `
    mutation CreateUser($userData: users_insert_input!) {
      insert_users_one(object: $userData) {
        id
        name
        email
        username
        imageUrl
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
        imageUrl
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
        steps
        prep_time
        cook_time
        servings
        difficulty
        cuisine
        metadata
        imageUrl
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
        steps
        prep_time
        cook_time
        servings
        difficulty
        cuisine
        metadata
        imageUrl
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

  return {
    CREATE_USER,
    UPDATE_USER,
    UPDATE_USER_PASSWORD,
    CREATE_RECIPE,
    UPDATE_RECIPE,
    DELETE_RECIPE,
    SAVE_RECIPE,
    UNSAVE_RECIPE,
  };
}

module.exports = Mutations();

