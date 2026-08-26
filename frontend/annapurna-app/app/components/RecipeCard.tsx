'use client';

import { useState } from 'react';
import { Recipe } from '../models/recipe';
import recipeService from '../services/recipeService';
import { useRouter } from 'next/navigation';

interface RecipeCardProps {
  recipe: Recipe;
  toCreate?: boolean;
}

export default function RecipeCard({ recipe, toCreate = false }: RecipeCardProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(recipe.isFavorite);
  const [isSaving, setIsSaving] = useState(false);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!recipe.id) {
      console.error('Cannot favorite recipe without an ID.');
      return;
    }

    setIsSaving(true);
    try {
      if (isFavorite) {
        await recipeService.removeFavorite(recipe.id);
        setIsFavorite(false);
      } else {
        await recipeService.addFavorite(recipe.id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error(`Failed to toggle favorite for recipe ${recipe.title}:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCardClick = async () => {
    if (toCreate && recipe) {
      try {
        const savedRecipe = await recipeService.createRecipe(recipe);
        router.push(`/chat?recipeId=${savedRecipe.id}`);
      } catch (error) {
        console.error('Failed to save recipe. Please try again.', error);
      }
    } else if (recipe.id) {
      router.push(`/chat?recipeId=${recipe.id}`);
    }
  };

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const difficultyCapitalized = recipe.difficulty
    ? recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)
    : '';

  return (
    <div
      className="relative recipe-card bg-white rounded-2xl shadow-sm hover:shadow-md overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 border border-stone-200/80 flex flex-col justify-between"
      onClick={handleCardClick}
    >
      <div className="absolute top-2.5 right-2.5 z-10">
        <button
          className={`favorite-button p-1.5 sm:p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-colors ${
            isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={toggleFavorite}
          disabled={isSaving || !recipe.id}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      <div className="recipe-content flex flex-col justify-between h-full">
        <div>
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-40 sm:h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Annapurna+Recipe';
              }}
            />
          ) : (
            <div className="w-full h-40 sm:h-48 bg-stone-200 flex items-center justify-center">
              <span className="text-stone-400 font-medium text-xs sm:text-sm">Annapurna Recipe</span>
            </div>
          )}

          {recipe.tags && recipe.tags.length > 0 && (
            <div className="chip-container flex gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 flex-wrap">
              {recipe.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-stone-100 text-stone-700 text-[10px] sm:text-xs font-medium rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="recipe-header px-3.5 sm:px-4 pt-1">
            <h3 className="recipe-title text-base sm:text-lg font-bold text-stone-900 mb-1 sm:mb-1.5 line-clamp-1">
              {recipe.title}
            </h3>
            <div className="recipe-details flex items-center gap-2.5 sm:gap-3 text-[11px] sm:text-xs text-stone-600 mb-2">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {totalTime > 0 ? `${totalTime}m` : 'Quick'}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {recipe.servings || 2}
              </span>
              {difficultyCapitalized && (
                <span className="font-medium text-stone-700 capitalize">• {difficultyCapitalized}</span>
              )}
            </div>
          </div>

          {recipe.description && (
            <p
              className="recipe-description px-3.5 sm:px-4 text-stone-600 text-xs line-clamp-2 mb-3"
              dangerouslySetInnerHTML={{ __html: recipe.description }}
            />
          )}
        </div>

        <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-1 sm:pt-2">
          <button
            className="view-recipe-btn w-full bg-[#ff9f1d] hover:bg-[#e88d15] text-white font-semibold py-2 rounded-xl transition-colors text-xs sm:text-sm shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
          >
            View Recipe & Cook
          </button>
        </div>
      </div>
    </div>
  );
}
