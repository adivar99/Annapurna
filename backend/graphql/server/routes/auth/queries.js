/**
 * GraphQL Query Strings for Auth Module
 * Contains all read operations (queries)
 */

function Queries() {
  // User Queries
  const CHECK_USER_EXISTS = `
    query CheckUser($email: String!) {
      users(where: {email: {_eq: $email}}) {
        id
      }
    }
  `;

  const FIND_USER_BY_EMAIL = `
    query LoginUser($email: String!) {
      users(where: {email: {_eq: $email}}) {
        id
        name
        email
        username
        hashed_password
        imageUrl
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
        imageUrl
        created_at
        updated_at
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

  const GET_RECIPE_BY_ID = `
    query GetRecipeById($recipeId: uuid!) {
      recipes_by_pk(id: $recipeId) {
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

  const FILTER_RECIPES_BY_CUISINE = `
    query FilterRecipesByCuisine($cuisine: cuisine_type!, $limit: Int, $offset: Int) {
      recipes(
        where: {cuisine: {_eq: $cuisine}},
        limit: $limit,
        offset: $offset,
        order_by: {created_at: desc}
      ) {
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

  const FILTER_RECIPES_BY_DIFFICULTY = `
    query FilterRecipesByDifficulty($difficulty: recipe_difficulty!, $limit: Int, $offset: Int) {
      recipes(
        where: {difficulty: {_eq: $difficulty}},
        limit: $limit,
        offset: $offset,
        order_by: {created_at: desc}
      ) {
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
    }
  `;

  const CHECK_RECIPE_SAVED = `
    query CheckRecipeSaved($userId: uuid!, $recipeId: uuid!) {
      saved_recipes(where: {user_id: {_eq: $userId}, recipe_id: {_eq: $recipeId}}) {
        id
      }
    }
  `;

  return {
    // User Queries
    CHECK_USER_EXISTS,
    FIND_USER_BY_EMAIL,
    GET_USER_BY_ID,
    // Recipe Queries
    GET_ALL_RECIPES,
    GET_RECIPE_BY_ID,
    SEARCH_RECIPES,
    FILTER_RECIPES_BY_CUISINE,
    FILTER_RECIPES_BY_DIFFICULTY,
    // Saved Recipes Queries
    GET_USER_SAVED_RECIPES,
    CHECK_RECIPE_SAVED,
  };
}

module.exports = Queries();

