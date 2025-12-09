'use client';

import { useState, useEffect } from 'react';
import { Recipe } from '../models/recipe';
import recipeService from '../services/recipeService';
import spoonacularService from '../services/spoonacularService';
import authService from '../services/authService';
import RecipeCard from '../components/RecipeCard';

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [trendingRecipes, setTrendingRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
    loadTrendingRecipes();
  }, []);

  const loadRecipes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedRecipes = await recipeService.getLatestRecipes();
      setRecipes(loadedRecipes);
      checkFavorites(loadedRecipes);
    } catch (err: any) {
      setError('Failed to load recipes. Please try again.');
      console.error('Error loading recipes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrendingRecipes = async () => {
    setIsLoadingTrending(true);
    setTrendingError(null);
    try {
      const response = await spoonacularService.getRandomRecipes(6);
      const mappedRecipes: Recipe[] = response.recipes.map((recipe: any) => ({
        id: '', // No ID for trending recipes until saved
        title: recipe.title,
        description: recipe.summary,
        instructions: recipe.analyzedInstructions[0]?.steps.map((step: any) => step.step) || [],
        ingredients: recipe.extendedIngredients.map((ing: any) => ({
          name: ing.name,
          quantity: ing.amount,
          unit: ing.unit,
          notes: ing.original,
        })),
        prep_time: recipe.preparationMinutes || 0,
        cook_time: recipe.cookingMinutes || 0,
        servings: recipe.servings,
        difficulty: mapDifficulty(recipe.readyInMinutes),
        cuisine: recipe.cuisines?.[0],
        tags: recipe.dishTypes || [],
        created_at: new Date(),
        updated_at: new Date(),
        imageUrl: recipe.image,
        isFavorite: false,
      }));
      setTrendingRecipes(mappedRecipes);
    } catch (err: any) {
      setTrendingError('Failed to load trending recipes. Please try again.');
      console.error('Error loading trending recipes:', err);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  const mapDifficulty = (minutes: number): string => {
    if (minutes <= 30) return 'easy';
    if (minutes <= 60) return 'medium';
    return 'hard';
  };

  const checkFavorites = async (recipesToCheck: Recipe[]) => {
    const user = authService.getUser();
    if (!user) {
      return;
    }

    try {
      const favourites = await recipeService.getFavouriteIds();
      console.log('Marking favourites:', favourites);
      const updatedRecipes = recipesToCheck.map((recipe) => {
        if (favourites.includes(recipe.id)) {
          return { ...recipe, isFavorite: true };
        }
        return recipe;
      });
      setRecipes(updatedRecipes);
    } catch (err) {
      console.log("Error fetching user's favourite recipes", err);
    }
  };

  return (
    <div className="home-page-wrapper min-h-screen bg-gray-50 text-white">
      <div className="main-content flex flex-col flex-1 p-8 gap-8">
        {/* Recently Added Section */}
        <div className="recipes-panel flex-1">
          <h2 className="text-3xl font-semibold mb-6 text-gray-900">Recently Added</h2>

          {isLoading && (
            <div className="loading-container flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          )}

          {error && (
            <div className="error-container flex flex-col items-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadRecipes}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <div className="recipes-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recipes.length > 0 ? (
                recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))
              ) : (
                <div className="no-recipes col-span-full text-center py-12 px-6 bg-gray-200 rounded-xl">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <p className="text-gray-700 text-xl">No recipes found. Try refreshing the page.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trending Recipes Section */}
        <div className="recipes-panel flex-1">
          <h2 className="text-3xl font-semibold mb-6 text-gray-900">Trending Recipes</h2>

          {isLoadingTrending && (
            <div className="loading-container flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          )}

          {trendingError && (
            <div className="error-container flex flex-col items-center py-8">
              <p className="text-red-500 mb-4">{trendingError}</p>
              <button
                onClick={loadTrendingRecipes}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoadingTrending && !trendingError && (
            <div className="recipes-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trendingRecipes.length > 0 ? (
                trendingRecipes.map((recipe, index) => (
                  <RecipeCard key={index} recipe={recipe} toCreate={true} />
                ))
              ) : (
                <div className="no-recipes col-span-full text-center py-12 px-6 bg-gray-200 rounded-xl">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  <p className="text-gray-700 text-xl">No trending recipes available at the moment.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

