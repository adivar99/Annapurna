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
        console.log(`Recipe ${recipe.title} removed from favorites`);
      } else {
        await recipeService.addFavorite(recipe.id);
        setIsFavorite(true);
        console.log(`Recipe ${recipe.title} added to favorites`);
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
        // Redirect to chat or recipe detail page
        router.push(`/chat?recipeId=${savedRecipe.id}`);
      } catch (error) {
        console.error('Failed to save recipe. Please try again.', error);
      }
    } else if (recipe.id) {
      router.push(`/chat?recipeId=${recipe.id}`);
    }
  };

  const totalTime = recipe.prep_time + recipe.cook_time;
  const difficultyCapitalized = recipe.difficulty 
    ? recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)
    : '';

  return (
    <div 
      className="recipe-card bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105"
      onClick={handleCardClick}
    >
      <div className="favorite-button-container absolute top-3 right-3 z-10">
        <button
          className={`favorite-button p-2 rounded-full bg-white shadow-md transition-colors ${
            isFavorite ? 'text-red-500' : 'text-gray-400'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={toggleFavorite}
          disabled={isSaving || !recipe.id}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            className="w-6 h-6"
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

      <div className="recipe-content">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Recipe';
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
          </div>
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="chip-container flex gap-2 px-4 py-2 flex-wrap">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="recipe-header px-4 pt-2">
          <h3 className="recipe-title text-xl font-semibold text-gray-900 mb-2">
            {recipe.title}
          </h3>
          <div className="recipe-details flex items-center gap-4 text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {totalTime} min
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {recipe.servings}
            </span>
            {difficultyCapitalized && (
              <span>Difficulty: {difficultyCapitalized}</span>
            )}
          </div>
        </div>

        {recipe.description && (
          <p
            className="recipe-description px-4 py-2 text-gray-600 text-sm line-clamp-3"
            dangerouslySetInnerHTML={{ __html: recipe.description }}
          />
        )}

        <div className="px-4 pb-4">
          <button
            className="view-recipe-btn w-full bg-orange-500 hover:bg-red-500 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
          >
            View Recipe
          </button>
        </div>
      </div>
    </div>
  );
}

