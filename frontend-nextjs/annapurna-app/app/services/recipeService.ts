import { Recipe } from '../models/recipe';
import authService from './authService';

const API_BASE_URL = 'http://localhost:3001/api/v1';

class RecipeService {
  /**
   * Get the latest recipes
   * @returns Promise with array of recipes
   */
  async getLatestRecipes(): Promise<Recipe[]> {
    try {
      const token = authService.getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/recipes/latest`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch latest recipes');
      }

      const data = await response.json();
      return data.map((recipe: any) => ({
        ...recipe,
        created_at: recipe.created_at ? new Date(recipe.created_at) : new Date(),
        updated_at: recipe.updated_at ? new Date(recipe.updated_at) : new Date(),
        isFavorite: false, // Will be set by checkFavorites
      }));
    } catch (error) {
      console.error('Error fetching latest recipes:', error);
      throw error;
    }
  }

  /**
   * Get favorite recipe IDs for the current user
   * @returns Promise with array of recipe IDs
   */
  async getFavouriteIds(): Promise<string[]> {
    try {
      const token = authService.getToken();
      if (!token) {
        return [];
      }

      const response = await fetch(`${API_BASE_URL}/auth/me/save-recipe`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch favorite recipe IDs');
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching favorite recipe IDs:', error);
      return [];
    }
  }

  /**
   * Add a recipe to favorites
   * @param recipeId - The recipe ID to add to favorites
   */
  async addFavorite(recipeId: string): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/auth/me/save-recipe/${recipeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to add recipe to favorites');
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  /**
   * Remove a recipe from favorites
   * @param recipeId - The recipe ID to remove from favorites
   */
  async removeFavorite(recipeId: string): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/auth/me/save-recipe/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove recipe from favorites');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }

  /**
   * Create a new recipe
   * @param recipe - The recipe data to create
   * @returns Promise with the created recipe
   */
  async createRecipe(recipe: Recipe): Promise<Recipe> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/recipes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(recipe),
      });

      if (!response.ok) {
        throw new Error('Failed to create recipe');
      }

      const data = await response.json();
      return {
        ...data,
        created_at: data.created_at ? new Date(data.created_at) : new Date(),
        updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
        isFavorite: false,
      };
    } catch (error) {
      console.error('Error creating recipe:', error);
      throw error;
    }
  }
}

export const recipeService = new RecipeService();
export default recipeService;

