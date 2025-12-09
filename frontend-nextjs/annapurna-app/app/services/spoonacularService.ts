const SPOONACULAR_API_URL = 'https://api.spoonacular.com';
const SPOONACULAR_API_KEY = '260d38297d1e497f8e57e56e6e9271e6';

interface SpoonacularRecipe {
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
  preparationMinutes: number;
  cookingMinutes: number;
  readyInMinutes: number;
  servings: number;
  cuisines: string[];
  dishTypes: string[];
  image: string;
}

interface SpoonacularResponse {
  recipes: SpoonacularRecipe[];
}

class SpoonacularService {
  /**
   * Get random recipes from Spoonacular API
   * @param number - Number of recipes to fetch (default: 6)
   * @returns Promise with array of recipes
   */
  async getRandomRecipes(number: number = 6): Promise<SpoonacularResponse> {
    try {
      const params = new URLSearchParams({
        apiKey: SPOONACULAR_API_KEY,
        number: number.toString(),
      });

      const response = await fetch(`${SPOONACULAR_API_URL}/recipes/random?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch random recipes from Spoonacular');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching random recipes:', error);
      throw error;
    }
  }
}

export const spoonacularService = new SpoonacularService();
export default spoonacularService;

