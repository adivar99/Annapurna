'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Recipe } from '../models/recipe';
import recipeService from '../services/recipeService';
import spoonacularService, { AutocompleteResult } from '../services/spoonacularService';
import RecipeCard from '../components/RecipeCard';
import { useAuth } from '../context/AuthContext';

export default function AdvancedSearchPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: isAuthLoading, logout } = useAuth();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Recipes');
  const [selectedTimeBracket, setSelectedTimeBracket] = useState<string>('all'); // all, <15, 15-30, 30-60, >60
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all'); // all, easy, medium, hard
  const [categories, setCategories] = useState<string[]>(['All Recipes']);

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isAuthLoading, router]);

  // Load all recipes and compute top categories
  useEffect(() => {
    async function fetchAll() {
      setIsLoading(true);
      try {
        const data = await recipeService.getAllRecipes(0, 100);
        setRecipes(data);
        setFilteredRecipes(data);

        // Derive top 10 dynamic categories from recipe tags
        const tagCounts: Record<string, number> = {};
        data.forEach(r => {
          if (r.tags && Array.isArray(r.tags)) {
            r.tags.forEach(t => {
              const cleanTag = t.toLowerCase().trim();
              if (cleanTag) {
                tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
              }
            });
          }
        });

        const topTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(entry => entry[0]);

        setCategories(['All Recipes', ...topTags]);
      } catch (err) {
        console.error('Failed to load recipes for search:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoggedIn) {
      fetchAll();
    }
  }, [isLoggedIn]);

  // Handle autocomplete with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await spoonacularService.getRecipeAutocomplete(searchQuery, 6);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Dismiss suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter evaluation
  useEffect(() => {
    let result = [...recipes];

    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // 2. Category / Tag Filter
    if (selectedCategory !== 'All Recipes') {
      result = result.filter(r =>
        r.tags && r.tags.some(t => t.toLowerCase() === selectedCategory.toLowerCase())
      );
    }

    // 3. Time Filter
    if (selectedTimeBracket !== 'all') {
      result = result.filter(r => {
        const total = (r.prep_time || 0) + (r.cook_time || 0);
        if (selectedTimeBracket === '<15') return total > 0 && total < 15;
        if (selectedTimeBracket === '15-30') return total >= 15 && total <= 30;
        if (selectedTimeBracket === '30-60') return total > 30 && total <= 60;
        if (selectedTimeBracket === '>60') return total > 60;
        return true;
      });
    }

    // 4. Difficulty Filter
    if (selectedDifficulty !== 'all') {
      result = result.filter(r => (r.difficulty || '').toLowerCase() === selectedDifficulty.toLowerCase());
    }

    setFilteredRecipes(result);
  }, [searchQuery, selectedCategory, selectedTimeBracket, selectedDifficulty, recipes]);

  // Handle selecting a Spoonacular autocomplete suggestion
  const handleSelectSuggestion = async (suggestion: AutocompleteResult) => {
    setShowSuggestions(false);
    setIsLoading(true);
    try {
      const details = await spoonacularService.getRecipeInfo(suggestion.id);
      const mapped = spoonacularService.mapSpoonacularToRecipe(details);
      const saved = await recipeService.createRecipe(mapped);

      setRecipes(prev => [saved, ...prev]);
      setSearchQuery('');
      router.push(`/chat?recipeId=${saved.id}`);
    } catch (err) {
      console.error('Failed to import Spoonacular recipe:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Search Header Bar */}
      <header className="bg-[#758e4f] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/home" className="text-2xl font-bold italiana text-white drop-shadow flex-shrink-0">
            Annapurna
          </Link>

          {/* Autocomplete Search Container */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                placeholder="Search recipes, ingredients, tags..."
                className="w-full bg-white text-stone-800 placeholder-stone-400 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f1d] shadow-inner"
              />
              <span className="absolute left-3 top-2.5 text-stone-400 text-sm">🔍</span>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50 text-stone-800">
                <div className="px-3 py-1.5 bg-stone-100 text-[11px] font-bold text-stone-500 uppercase">
                  Spoonacular Suggestions (click to auto-import)
                </div>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 text-sm flex items-center justify-between border-b border-stone-100 last:border-0 transition"
                  >
                    <span className="font-medium text-stone-900">{s.title}</span>
                    <span className="text-xs text-[#ff9f1d] font-semibold">✨ Import</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition flex-shrink-0"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Filter & Results Layout */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Panel: Facet Filters */}
          <aside className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6 h-fit sticky top-24">
            <div>
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-3">Categories & Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-[#ff9f1d] text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-200 pt-5">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-3">Cooking Time</h3>
              <div className="space-y-2">
                {[
                  { label: 'Any Time', value: 'all' },
                  { label: '< 15 mins', value: '<15' },
                  { label: '15 - 30 mins', value: '15-30' },
                  { label: '30 - 60 mins', value: '30-60' },
                  { label: '> 60 mins', value: '>60' },
                ].map((tb) => (
                  <label key={tb.value} className="flex items-center space-x-2 text-xs font-medium text-stone-700 cursor-pointer">
                    <input
                      type="radio"
                      name="timeBracket"
                      checked={selectedTimeBracket === tb.value}
                      onChange={() => setSelectedTimeBracket(tb.value)}
                      className="text-[#ff9f1d] focus:ring-[#ff9f1d]"
                    />
                    <span>{tb.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-200 pt-5">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-3">Difficulty</h3>
              <div className="flex rounded-xl overflow-hidden border border-stone-300">
                {['all', 'easy', 'medium', 'hard'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDifficulty(d)}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase transition ${
                      selectedDifficulty === d
                        ? 'bg-[#758e4f] text-white'
                        : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {(selectedCategory !== 'All Recipes' || selectedTimeBracket !== 'all' || selectedDifficulty !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('All Recipes');
                  setSelectedTimeBracket('all');
                  setSelectedDifficulty('all');
                  setSearchQuery('');
                }}
                className="w-full text-center text-xs font-semibold text-red-600 hover:text-red-700 pt-2"
              >
                Reset All Filters ✕
              </button>
            )}
          </aside>

          {/* Right Panel: Filtered Results Grid */}
          <main className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-stone-900">
                {filteredRecipes.length} {filteredRecipes.length === 1 ? 'Recipe' : 'Recipes'} Found
              </h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ff9f1d] border-t-transparent"></div>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-lg font-bold text-stone-800 mb-1">No Matching Recipes</h3>
                <p className="text-stone-500 text-xs max-w-sm mx-auto">
                  Try broadening your search criteria or type in the top bar to import from Spoonacular.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
