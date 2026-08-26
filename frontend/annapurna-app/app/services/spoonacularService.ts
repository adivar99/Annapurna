import { Recipe } from '../models/recipe';

const SPOONACULAR_API_URL = 'https://api.spoonacular.com';
const SPOONACULAR_API_KEY = '260d38297d1e497f8e57e56e6e9271e6';

export interface SpoonacularRecipe {
  id: number;
  title: string;
  summary: string;
  analyzedInstructions: Array<{
    steps: Array<{
      step: string;
    }>;
  }>;
  extendedIngredients: Array<{
    name: string;
    amount: number;
    unit: string;
    original: string;
  }>;
  preparationMinutes?: number;
  cookingMinutes?: number;
  readyInMinutes: number;
  servings: number;
  cuisines: string[];
  dishTypes: string[];
  image: string;
}

export interface AutocompleteResult {
  id: number;
  title: string;
  imageType: string;
}

class SpoonacularService {
  /**
   * Get random recipes from Spoonacular API
   */
  async getRandomRecipes(number: number = 6): Promise<{ recipes: SpoonacularRecipe[] }> {
    try {
      const params = new URLSearchParams({
        apiKey: SPOONACULAR_API_KEY,
        number: number.toString(),
      });

      const response = await fetch(`${SPOONACULAR_API_URL}/recipes/random?${params}`);
      if (!response.ok) throw new Error('Failed to fetch random recipes');
      return await response.json();
    } catch (error) {
      console.error('Error fetching random recipes:', error);
      throw error;
    }
  }

  /**
   * Autocomplete recipe search
   */
  async getRecipeAutocomplete(query: string, number: number = 5): Promise<AutocompleteResult[]> {
    if (!query || query.length < 2) return [];
    try {
      const params = new URLSearchParams({
        apiKey: SPOONACULAR_API_KEY,
        query,
        number: number.toString(),
      });

      const response = await fetch(`${SPOONACULAR_API_URL}/recipes/autocomplete?${params}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching recipe autocomplete:', error);
      return [];
    }
  }

  /**
   * Get recipe information by Spoonacular ID
   */
  async getRecipeInfo(id: number | string): Promise<SpoonacularRecipe> {
    try {
      const params = new URLSearchParams({
        apiKey: SPOONACULAR_API_KEY,
        includeNutrition: 'false',
      });

      const response = await fetch(`${SPOONACULAR_API_URL}/recipes/${id}/information?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recipe details');
      return await response.json();
    } catch (error) {
      console.error('Error fetching recipe info:', error);
      throw error;
    }
  }

  /**
   * Convert Spoonacular recipe to Annapurna Recipe model
   */
  mapSpoonacularToRecipe(sRecipe: SpoonacularRecipe): Partial<Recipe> {
    const instructions: string[] = [];
    if (sRecipe.analyzedInstructions && sRecipe.analyzedInstructions.length > 0) {
      sRecipe.analyzedInstructions[0].steps.forEach(s => instructions.push(s.step));
    } else if (sRecipe.summary) {
      instructions.push(sRecipe.summary.replace(/<[^>]*>?/gm, ''));
    }

    const ingredients = (sRecipe.extendedIngredients || []).map(ing => ({
      name: ing.name || '',
      quantity: ing.amount || 1,
      unit: ing.unit || '',
      notes: ing.original || undefined
    }));

    let difficulty = 'medium';
    if (sRecipe.readyInMinutes <= 30) difficulty = 'easy';
    else if (sRecipe.readyInMinutes > 60) difficulty = 'hard';

    return {
      title: sRecipe.title,
      description: sRecipe.summary ? sRecipe.summary.replace(/<[^>]*>?/gm, '').slice(0, 300) : '',
      instructions: instructions.length > 0 ? instructions : ['Follow standard preparation instructions.'],
      ingredients,
      prep_time: sRecipe.preparationMinutes || Math.floor(sRecipe.readyInMinutes / 3) || 10,
      cook_time: sRecipe.cookingMinutes || Math.floor((sRecipe.readyInMinutes * 2) / 3) || 20,
      servings: sRecipe.servings || 2,
      difficulty,
      cuisine: (sRecipe.cuisines && sRecipe.cuisines[0]) || 'International',
      tags: sRecipe.dishTypes || ['dinner'],
      imageUrl: sRecipe.image || '',
    };
  }
}

export const spoonacularService = new SpoonacularService();
export default spoonacularService;
