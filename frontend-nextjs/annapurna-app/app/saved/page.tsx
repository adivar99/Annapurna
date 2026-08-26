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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 italiana">Your Saved Recipes</h1>
          <p className="text-stone-600 text-sm mt-1">Your personal collection of favorite culinary creations.</p>
        </div>
        <Link
          href="/home"
          className="text-sm font-semibold text-[#ff9f1d] hover:text-[#e88d15] flex items-center space-x-1"
        >
          <span>Discover More Recipes</span>
          <span>→</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ff9f1d] border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-red-50 rounded-2xl border border-red-200 p-8">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadSavedRecipes}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition"
          >
            Try Again
          </button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 p-12 shadow-sm">
          <div className="text-5xl mb-4">📖</div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">No Saved Recipes Yet</h2>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            Explore recipes on the home page or search for your favorite cuisines, then tap the heart icon to save them here.
          </p>
          <Link
            href="/home"
            className="inline-block bg-[#ff9f1d] hover:bg-[#e88d15] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            Browse Recipes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
