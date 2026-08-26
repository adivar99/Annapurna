/**
 * Resolvers for Database Operations
 */

const { makeGraphQLRequest } = require('./shared/graphql');
const queries = require('./queries');
const mutations = require('./mutations');

class Resolvers {

  // ==================== User Resolvers ====================

  static async checkUserExists(email, username) {
    const { data, error } = await makeGraphQLRequest(queries.CHECK_USER_EXISTS, { email, username })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.users.length > 0;
  }

  static async findUserByEmailOrUsername(login) {
    const { data, error } = await makeGraphQLRequest(queries.FIND_USER_BY_EMAIL_OR_USERNAME, { login })
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

    return (data.saved_recipes || []).map(sr => sr.recipe).filter(Boolean);
  }

  static async getUserSavedRecipeIds(userId) {
    const { data, error } = await makeGraphQLRequest(queries.GET_USER_SAVED_RECIPPE_IDS, { userId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return (data.saved_recipes || []).map(sr => sr.recipe_id);
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

  // ==================== Chat Resolvers ====================

  static async getUserChatSessions(userId) {
    const { data, error } = await makeGraphQLRequest(queries.GET_USER_CHAT_SESSIONS, { userId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return (data.chat_sessions || []).map(s => ({
      session_id: s.id,
      recipe_id: s.recipe_id,
      recipe_title: s.recipe ? s.recipe.title : 'Recipe Conversation',
      last_message: s.messages && s.messages.length > 0 ? s.messages[0].text : '',
      updated_at: s.updated_at
    }));
  }

  static async getChatSessionById(sessionId) {
    const { data, error } = await makeGraphQLRequest(queries.GET_CHAT_SESSION_BY_ID, { sessionId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    const s = data.chat_sessions_by_pk;
    if (!s) return null;

    return {
      session_id: s.id,
      user_id: s.user_id,
      recipe_id: s.recipe_id,
      recipe_title: s.recipe ? s.recipe.title : 'Recipe Conversation',
      recipe: s.recipe,
      messages: s.messages || [],
      created_at: s.created_at,
      updated_at: s.updated_at
    };
  }

  static async getChatSessionByRecipe(userId, recipeId) {
    const { data, error } = await makeGraphQLRequest(queries.GET_CHAT_SESSION_BY_RECIPE, { userId, recipeId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    if (!data.chat_sessions || data.chat_sessions.length === 0) {
      return null;
    }

    const s = data.chat_sessions[0];
    return {
      session_id: s.id,
      user_id: s.user_id,
      recipe_id: s.recipe_id,
      messages: s.messages || [],
      created_at: s.created_at,
      updated_at: s.updated_at
    };
  }

  static async createChatSession(userId, recipeId) {
    const { data, error } = await makeGraphQLRequest(mutations.CREATE_CHAT_SESSION, {
      object: { user_id: userId, recipe_id: recipeId }
    })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.insert_chat_sessions_one;
  }

  static async deleteChatSession(sessionId) {
    const { data, error } = await makeGraphQLRequest(mutations.DELETE_CHAT_SESSION, { sessionId })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.delete_chat_sessions_by_pk;
  }

  static async addChatMessage(sessionId, sender, text) {
    const { data, error } = await makeGraphQLRequest(mutations.ADD_CHAT_MESSAGE, {
      object: { session_id: sessionId, sender, text }
    })
      .then(response => ({ data: response.data, error: null }))
      .catch(error => ({ data: null, error }));

    if (error) {
      throw new Error(error.message);
    }

    return data.insert_chat_messages_one;
  }
}

module.exports = Resolvers;
