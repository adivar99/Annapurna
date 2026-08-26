'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import recipeService from '../services/recipeService';
import { ApiClient } from '../services/apiClient';

export default function AddRecipePage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: isAuthLoading } = useAuth();

  // Mode: Manual Form vs AI Parse
  const [isParseMode, setIsParseMode] = useState<boolean>(false);
  const [rawRecipeText, setRawRecipeText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [prepTime, setPrepTime] = useState<number>(15);
  const [cookTime, setCookTime] = useState<number>(30);
  const [servings, setServings] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<string>('easy');
  const [cuisine, setCuisine] = useState<string>('General');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Chips State
  const [ingredients, setIngredients] = useState<Array<{ name: string; quantity: number; unit: string; notes?: string }>>([]);
  const [ingredientInput, setIngredientInput] = useState<string>('');

  const [instructions, setInstructions] = useState<string[]>([]);
  const [instructionInput, setInstructionInput] = useState<string>('');

  const [tags, setTags] = useState<string[]>(['homemade', 'dinner']);
  const [tagInput, setTagInput] = useState<string>('');

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isAuthLoading, router]);

  const addIngredient = () => {
    if (!ingredientInput.trim()) return;
    setIngredients(prev => [...prev, { name: ingredientInput.trim(), quantity: 1, unit: '', notes: '' }]);
    setIngredientInput('');
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    if (!instructionInput.trim()) return;
    setInstructions(prev => [...prev, instructionInput.trim()]);
    setInstructionInput('');
  };

  const removeInstruction = (index: number) => {
    setInstructions(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (!tagInput.trim() || tags.includes(tagInput.trim().toLowerCase())) return;
    setTags(prev => [...prev, tagInput.trim().toLowerCase()]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleAIParse = async () => {
    if (!rawRecipeText.trim()) return;

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const parsed = await recipeService.parseRecipe(rawRecipeText);

      if (parsed.title) setTitle(parsed.title);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.prep_time) setPrepTime(parsed.prep_time);
      if (parsed.cook_time) setCookTime(parsed.cook_time);
      if (parsed.servings) setServings(parsed.servings);
      if (parsed.difficulty) setDifficulty(parsed.difficulty);
      if (parsed.cuisine) setCuisine(parsed.cuisine);
      if (parsed.tags && parsed.tags.length > 0) setTags(parsed.tags);
      if (parsed.ingredients && parsed.ingredients.length > 0) setIngredients(parsed.ingredients);
      if (parsed.instructions && parsed.instructions.length > 0) setInstructions(parsed.instructions);

      setIsParseMode(false);
    } catch (err: any) {
      console.error('AI Parse error:', err);
      setErrorMessage(err.message || 'Failed to parse recipe text.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    try {
      const result = await ApiClient.uploadFile(file);
      if (result.data?.public_url) {
        setImageUrl(result.data.public_url);
      }
    } catch (err: any) {
      console.warn('Direct upload failed, keeping local preview:', err);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Recipe title is required.');
      return;
    }
    if (ingredients.length === 0) {
      setErrorMessage('Please add at least one ingredient.');
      return;
    }
    if (instructions.length === 0) {
      setErrorMessage('Please add at least one instruction step.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await recipeService.createRecipe({
        title,
        description,
        prep_time: Number(prepTime) || 0,
        cook_time: Number(cookTime) || 0,
        servings: Number(servings) || 1,
        difficulty,
        cuisine,
        tags,
        ingredients,
        instructions,
        imageUrl,
      });

      router.push(`/chat?recipeId=${created.id}`);
    } catch (err: any) {
      console.error('Submit recipe error:', err);
      setErrorMessage(err.message || 'Failed to save recipe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-stone-200 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 italiana">Create New Recipe</h1>
          <p className="text-stone-600 text-xs sm:text-sm">Manual recipe creation or AI auto-extraction.</p>
        </div>

        <button
          type="button"
          onClick={() => setIsParseMode(!isParseMode)}
          className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center space-x-1.5 shadow-sm ${
            isParseMode
              ? 'bg-stone-800 text-white hover:bg-stone-900'
              : 'bg-[#ff9f1d] text-white hover:bg-[#e88d15]'
          }`}
        >
          <span>{isParseMode ? '✍️ Switch to Form' : '✨ Paste Text & Auto-Parse (AI)'}</span>
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 p-3.5 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs sm:text-sm">
          {errorMessage}
        </div>
      )}

      {isParseMode ? (
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
          <label className="block text-xs sm:text-sm font-bold text-stone-800">
            Paste Unstructured Recipe Text (from blog, email, or notes):
          </label>
          <textarea
            rows={10}
            value={rawRecipeText}
            onChange={(e) => setRawRecipeText(e.target.value)}
            placeholder="e.g. Grandma's Secret Butter Chicken: You'll need 500g chicken thighs, 2 tbsp butter, garlic, ginger, garam masala..."
            className="w-full p-3.5 sm:p-4 border border-stone-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
          />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsParseMode(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs sm:text-sm font-medium hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAIParse}
              disabled={isParsing || !rawRecipeText.trim()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#ff9f1d] text-white text-xs sm:text-sm font-semibold hover:bg-[#e88d15] disabled:opacity-50 transition shadow-sm"
            >
              {isParsing ? 'Analyzing with AI...' : 'Parse & Populate Form'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-stone-200 space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-1">Recipe Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Creamy Tuscan Garlic Chicken"
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-1">Cuisine</label>
              <input
                type="text"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="Italian, Indian, etc."
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short intro or backstory for this dish..."
              className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-1">Prep Time (min)</label>
              <input
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full px-3 py-1.5 sm:py-2 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-1">Cook Time (min)</label>
              <input
                type="number"
                min={0}
                value={cookTime}
                onChange={(e) => setCookTime(Number(e.target.value))}
                className="w-full px-3 py-1.5 sm:py-2 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-1">Servings</label>
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full px-3 py-1.5 sm:py-2 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-1">Difficulty</label>
              <div className="flex rounded-xl overflow-hidden border border-stone-300">
                {['easy', 'medium', 'hard'].map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase transition ${
                      difficulty === d ? 'bg-[#ff9f1d] text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-1">Recipe Image</label>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-xs sm:text-sm text-stone-500 file:mr-3 file:py-1.5 file:px-3 sm:file:py-2 sm:file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              {imageUrl && (
                <img src={imageUrl} alt="Preview" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border flex-shrink-0" />
              )}
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4 sm:pt-5">
            <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-2">Ingredients *</label>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addIngredient();
                  }
                }}
                placeholder="e.g. 2 cups heavy cream (Enter)"
                className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
              />
              <button
                type="button"
                onClick={addIngredient}
                className="px-3 sm:px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-semibold flex-shrink-0"
              >
                + Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {ingredients.map((ing, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center bg-stone-100 text-stone-800 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium border border-stone-200"
                >
                  {ing.name}
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="ml-1.5 sm:ml-2 text-stone-400 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4 sm:pt-5">
            <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-2">Instructions / Steps *</label>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={instructionInput}
                onChange={(e) => setInstructionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInstruction();
                  }
                }}
                placeholder="e.g. Sauté garlic until fragrant (Enter)"
                className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
              />
              <button
                type="button"
                onClick={addInstruction}
                className="px-3 sm:px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-semibold flex-shrink-0"
              >
                + Step
              </button>
            </div>
            <div className="space-y-2">
              {instructions.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-stone-50 p-2 sm:p-2.5 rounded-xl border border-stone-200 text-xs text-stone-800"
                >
                  <span className="leading-relaxed">
                    <strong>{idx + 1}.</strong> {step}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeInstruction(idx)}
                    className="text-stone-400 hover:text-red-600 font-bold ml-2.5 flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4 sm:pt-5">
            <label className="block text-[11px] sm:text-xs font-bold text-stone-700 uppercase mb-2">Tags</label>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="e.g. quick, dinner, gluten-free"
                className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-stone-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#ff9f1d] focus:outline-none"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 sm:px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-semibold flex-shrink-0"
              >
                + Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center bg-orange-50 text-orange-800 px-2.5 py-1 rounded-full text-xs font-medium border border-orange-200"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1.5 text-orange-400 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-200 pt-5 sm:pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[#758e4f] hover:bg-[#627741] text-white px-8 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Recipe...' : 'Save & Start Cooking 🍳'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
