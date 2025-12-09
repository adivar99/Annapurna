/**
 * Resolvers for Auth Module
 * Contains all resolver functions that execute GraphQL queries
 */

const { makeGraphQLRequest } = require('./shared/graphql');
const queries = require('./queries');
const mutations = require('./mutations');

class Resolvers {

  // ==================== User Resolvers ====================

  static async checkUserExists(email) {
    const { data, error } = await makeGraphQLRequest(queries.CHECK_USER_EXISTS, { email })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.users.length > 0;
  }

  static async findUserByEmail(email) {
    const { data, error } = await makeGraphQLRequest(queries.FIND_USER_BY_EMAIL, { email })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    if (!data.users || data.users.length === 0) {
      return null;
    }

    return data.users[0];
  }

  static async getUserById(userId) {
    const { data, error } = await makeGraphQLRequest(queries.GET_USER_BY_ID, { userId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.users_by_pk;
  }

  static async createUser(userData) {
    const { data, error } = await makeGraphQLRequest(mutations.CREATE_USER, { userData })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.insert_users_one;
  }

  static async updateUser(userId, userData) {
    const { data, error } = await makeGraphQLRequest(mutations.UPDATE_USER, { userId, userData })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.update_users_by_pk;
  }

  static async updateUserPassword(userId, hashedPassword) {
    const { data, error } = await makeGraphQLRequest(mutations.UPDATE_USER_PASSWORD, { userId, hashedPassword })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.update_users_by_pk;
  }

  // ==================== Recipe Resolvers ====================

  static async getAllRecipes(limit = 50, offset = 0) {
    const { data, error } = await makeGraphQLRequest(queries.GET_ALL_RECIPES, { limit, offset })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.recipes;
  }

  static async getRecipeById(recipeId) {
    const { data, error } = await makeGraphQLRequest(queries.GET_RECIPE_BY_ID, { recipeId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.recipes_by_pk;
  }

  static async searchRecipes(searchTerm, limit = 50, offset = 0) {
    const { data, error } = await makeGraphQLRequest(queries.SEARCH_RECIPES, {
      searchTerm: `%${searchTerm}%`,
      limit,
      offset
    })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.recipes;
  }

  static async filterRecipesByCuisine(cuisine, limit = 50, offset = 0) {
    const { data, error } = await makeGraphQLRequest(queries.FILTER_RECIPES_BY_CUISINE, {
      cuisine,
      limit,
      offset
    })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.recipes;
  }

  static async filterRecipesByDifficulty(difficulty, limit = 50, offset = 0) {
    const { data, error } = await makeGraphQLRequest(queries.FILTER_RECIPES_BY_DIFFICULTY, {
      difficulty,
      limit,
      offset
    })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.recipes;
  }

  static async createRecipe(recipeData) {
    const { data, error } = await makeGraphQLRequest(mutations.CREATE_RECIPE, { recipeData })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.insert_recipes_one;
  }

  static async updateRecipe(recipeId, recipeData) {
    const { data, error } = await makeGraphQLRequest(mutations.UPDATE_RECIPE, { recipeId, recipeData })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.update_recipes_by_pk;
  }

  static async deleteRecipe(recipeId) {
    const { data, error } = await makeGraphQLRequest(mutations.DELETE_RECIPE, { recipeId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.delete_recipes_by_pk;
  }

  // ==================== Saved Recipes Resolvers ====================

  static async getUserSavedRecipes(userId, limit = 50, offset = 0) {
    const { data, error } = await makeGraphQLRequest(queries.GET_USER_SAVED_RECIPES, {
      userId,
      limit,
      offset
    })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.saved_recipes;
  }

  static async checkRecipeSaved(userId, recipeId) {
    const { data, error } = await makeGraphQLRequest(queries.CHECK_RECIPE_SAVED, { userId, recipeId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.saved_recipes.length > 0;
  }

  static async saveRecipe(userId, recipeId) {
    const { data, error } = await makeGraphQLRequest(mutations.SAVE_RECIPE, { userId, recipeId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.insert_saved_recipes_one;
  }

  static async unsaveRecipe(userId, recipeId) {
    const { data, error } = await makeGraphQLRequest(mutations.UNSAVE_RECIPE, { userId, recipeId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.delete_saved_recipes;
  }
}

module.exports = Resolvers;

