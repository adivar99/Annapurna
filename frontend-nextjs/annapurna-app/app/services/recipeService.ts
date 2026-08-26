import { Recipe } from '../models/recipe';
import { ApiClient } from './apiClient';

class RecipeService {
  /**
   * Get all recipes with pagination and optional search query
   */
  async getAllRecipes(skip = 0, limit = 50, query?: string): Promise<Recipe[]> {
    try {
      let endpoint = `/recipes/?skip=${skip}&limit=${limit}`;
      if (query) {
        endpoint += `&query=${encodeURIComponent(query)}`;
      }
      const data = await ApiClient.get<any[]>(endpoint);
      return data.map(this.formatRecipe);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }
  }

  /**
   * Get the latest recipes
   */
  async getLatestRecipes(limit = 6): Promise<Recipe[]> {
    try {
      const data = await ApiClient.get<any[]>(`/recipes/latest?limit=${limit}`);
      return data.map(this.formatRecipe);
    } catch (error) {
      console.error('Error fetching latest recipes:', error);
      throw error;
    }
  }

  /**
   * Get a recipe by its UUID
   */
  async getRecipeById(id: string): Promise<Recipe> {
    try {
      const data = await ApiClient.get<any>(`/recipes/${id}`);
      return this.formatRecipe(data);
    } catch (error) {
      console.error('Error fetching recipe by id:', error);
      throw error;
    }
  }

  /**
   * Get full saved recipes for the current user
   */
  async getFavourites(skip = 0, limit = 50): Promise<Recipe[]> {
    try {
      const data = await ApiClient.get<any[]>(`/auth/me/saved-recipes?skip=${skip}&limit=${limit}`);
      return data.map(r => ({
        ...this.formatRecipe(r),
        isFavorite: true
      }));
    } catch (error) {
      console.error('Error fetching favorite recipes:', error);
      return [];
    }
  }

  /**
   * Get favorite recipe IDs for the current user
   */
  async getFavouriteIds(): Promise<string[]> {
    try {
      const data = await ApiClient.get<string[]>('/auth/me/save-recipe');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching favorite recipe IDs:', error);
      return [];
    }
  }

  /**
   * Add a recipe to favorites
   */
  async addFavorite(recipeId: string): Promise<void> {
    try {
      await ApiClient.post(`/auth/me/save-recipe/${recipeId}`);
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  /**
   * Remove a recipe from favorites
   */
  async removeFavorite(recipeId: string): Promise<void> {
    try {
      await ApiClient.delete(`/auth/me/save-recipe/${recipeId}`);
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }

  /**
   * Create a new recipe
   */
  async createRecipe(recipe: Partial<Recipe>): Promise<Recipe> {
    try {
      const data = await ApiClient.post<any>('/recipes/', recipe);
      return this.formatRecipe(data);
    } catch (error) {
      console.error('Error creating recipe:', error);
      throw error;
    }
  }

  /**
   * Parse unstructured recipe text using AI
   */
  async parseRecipe(recipeText: string): Promise<Partial<Recipe>> {
    try {
      return await ApiClient.post<Partial<Recipe>>('/ai/parse', { recipe_text: recipeText });
    } catch (error) {
      console.error('Error parsing recipe:', error);
      throw error;
    }
  }

  /**
   * Ask contextual question about a recipe
   */
  async askQuestion(recipe: Recipe, question: string | string[]): Promise<{ response: string; recipe_id: string }> {
    try {
      return await ApiClient.post<{ response: string; recipe_id: string }>('/ai/ask-recipe-question', {
        recipe,
        question
      });
    } catch (error) {
      console.error('Error asking recipe question:', error);
      throw error;
    }
  }

  /**
   * Analyze recipe nutritional & culinary values
   */
  async analyzeRecipe(recipe: Recipe): Promise<{ response: string }> {
    try {
      return await ApiClient.post<{ response: string }>('/ai/analyze-recipe', recipe);
    } catch (error) {
      console.error('Error analyzing recipe:', error);
      throw error;
    }
  }

  private formatRecipe(recipe: any): Recipe {
    return {
      ...recipe,
      instructions: recipe.instructions || recipe.steps || [],
      ingredients: recipe.ingredients || [],
      imageUrl: recipe.imageUrl || recipe.image_url || '',
      created_at: recipe.created_at ? new Date(recipe.created_at) : new Date(),
      updated_at: recipe.updated_at ? new Date(recipe.updated_at) : new Date(),
      isFavorite: !!recipe.isFavorite,
    };
  }
}

export const recipeService = new RecipeService();
export default recipeService;
