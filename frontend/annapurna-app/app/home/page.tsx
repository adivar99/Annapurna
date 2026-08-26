'use client';

import { useState, useEffect } from 'react';
import { Recipe } from '../models/recipe';
import recipeService from '../services/recipeService';
import spoonacularService from '../services/spoonacularService';
import { useAuth } from '../context/AuthContext';
import RecipeCard from '../components/RecipeCard';

export default function HomePage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [trendingRecipes, setTrendingRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
    loadTrendingRecipes();
  }, [user]);

  const loadRecipes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedRecipes = await recipeService.getLatestRecipes(8);
      let favourites: string[] = [];
      try {
        favourites = await recipeService.getFavouriteIds();
      } catch {}

      const marked = loadedRecipes.map(r => ({
        ...r,
        isFavorite: favourites.includes(r.id)
      }));

      setRecipes(marked);
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
      const mappedRecipes: Recipe[] = response.recipes.map((recipe: any) => {
        const mapped = spoonacularService.mapSpoonacularToRecipe(recipe);
        return {
          id: '',
          title: mapped.title || '',
          description: mapped.description,
          instructions: mapped.instructions || [],
          ingredients: mapped.ingredients || [],
          prep_time: mapped.prep_time || 0,
          cook_time: mapped.cook_time || 0,
          servings: mapped.servings || 2,
          difficulty: mapped.difficulty || 'medium',
          cuisine: mapped.cuisine,
          tags: mapped.tags || [],
          created_at: new Date(),
          updated_at: new Date(),
          imageUrl: mapped.imageUrl || '',
          isFavorite: false,
        };
      });
      setTrendingRecipes(mappedRecipes);
    } catch (err: any) {
      setTrendingError('Failed to load trending recipes. Please try again.');
      console.error('Error loading trending recipes:', err);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  return (
    <div className="home-page-wrapper min-h-screen bg-stone-50 text-stone-900 pb-20 md:pb-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-8 sm:gap-10">
        {/* Recently Added Section */}
        <section className="recipes-panel">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-stone-900 italiana">Recently Added</h2>
              <p className="text-stone-600 text-xs sm:text-sm">Fresh recipes created by the community.</p>
            </div>
          </div>

          {isLoading && (
            <div className="loading-container flex justify-center py-10 sm:py-12">
              <div className="animate-spin rounded-full h-9 w-9 sm:h-10 sm:w-10 border-4 border-[#ff9f1d] border-t-transparent"></div>
            </div>
          )}

          {error && (
            <div className="error-container flex flex-col items-center py-6 sm:py-8 bg-red-50 rounded-2xl border border-red-200 p-5 sm:p-6">
              <p className="text-red-700 text-xs sm:text-sm mb-3 sm:mb-4">{error}</p>
              <button
                onClick={loadRecipes}
                className="px-4 sm:px-5 py-2 bg-[#ff9f1d] text-white rounded-xl text-xs font-semibold hover:bg-[#e88d15] transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <div className="recipes-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {recipes.length > 0 ? (
                recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))
              ) : (
                <div className="no-recipes col-span-full text-center py-10 sm:py-12 px-4 sm:px-6 bg-white border border-stone-200 rounded-2xl shadow-sm">
                  <div className="text-3xl sm:text-4xl mb-2">🍲</div>
                  <p className="text-stone-800 font-semibold text-sm sm:text-base mb-1">No recipes in database yet.</p>
                  <p className="text-stone-500 text-xs">Be the first to add one or choose from trending below!</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Trending Recipes Section */}
        <section className="recipes-panel border-t border-stone-200 pt-6 sm:pt-8">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-stone-900 italiana">Trending & Inspiring</h2>
              <p className="text-stone-600 text-xs sm:text-sm">Discover international ideas from Spoonacular.</p>
            </div>
          </div>

          {isLoadingTrending && (
            <div className="loading-container flex justify-center py-10 sm:py-12">
              <div className="animate-spin rounded-full h-9 w-9 sm:h-10 sm:w-10 border-4 border-[#ff9f1d] border-t-transparent"></div>
            </div>
          )}

          {trendingError && (
            <div className="error-container flex flex-col items-center py-6 sm:py-8 bg-red-50 rounded-2xl border border-red-200 p-5 sm:p-6">
              <p className="text-red-700 text-xs sm:text-sm mb-3 sm:mb-4">{trendingError}</p>
              <button
                onClick={loadTrendingRecipes}
                className="px-4 sm:px-5 py-2 bg-[#ff9f1d] text-white rounded-xl text-xs font-semibold hover:bg-[#e88d15] transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoadingTrending && !trendingError && (
            <div className="recipes-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {trendingRecipes.length > 0 ? (
                trendingRecipes.map((recipe, index) => (
                  <RecipeCard key={index} recipe={recipe} toCreate={true} />
                ))
              ) : (
                <div className="no-recipes col-span-full text-center py-10 sm:py-12 px-4 sm:px-6 bg-white border border-stone-200 rounded-2xl">
                  <p className="text-stone-500 text-xs sm:text-sm">No trending recipes available at the moment.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
