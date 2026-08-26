'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Recipe } from '../models/recipe';
import recipeService from '../services/recipeService';
import RecipeCard from '../components/RecipeCard';
import { useAuth } from '../context/AuthContext';

export default function SavedRecipesPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: isAuthLoading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isAuthLoading, router]);

  const loadSavedRecipes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await recipeService.getFavourites();
      setRecipes(data);
    } catch (err: any) {
      console.error('Failed to load saved recipes:', err);
      setError('Failed to load your saved recipes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadSavedRecipes();
    }
  }, [isLoggedIn]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 border-b border-stone-200 pb-4 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 italiana">Your Saved Recipes</h1>
          <p className="text-stone-600 text-xs sm:text-sm mt-0.5">Your personal collection of favorite culinary creations.</p>
        </div>
        <Link
          href="/home"
          className="text-xs sm:text-sm font-semibold text-[#ff9f1d] hover:text-[#e88d15] flex items-center space-x-1"
        >
          <span>Discover More</span>
          <span>→</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20 sm:py-24">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-[#ff9f1d] border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 sm:py-16 bg-red-50 rounded-2xl border border-red-200 p-6 sm:p-8">
          <p className="text-red-700 text-xs sm:text-sm mb-4">{error}</p>
          <button
            onClick={loadSavedRecipes}
            className="px-5 sm:px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition"
          >
            Try Again
          </button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 sm:py-20 bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 shadow-sm">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📖</div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-800 mb-1.5 sm:mb-2">No Saved Recipes Yet</h2>
          <p className="text-stone-500 text-xs sm:text-sm max-w-md mx-auto mb-5 sm:mb-6 leading-relaxed">
            Explore recipes on the home page or search for your favorite cuisines, then tap the heart icon to save them here.
          </p>
          <Link
            href="/home"
            className="inline-block bg-[#ff9f1d] hover:bg-[#e88d15] text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            Browse Recipes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
