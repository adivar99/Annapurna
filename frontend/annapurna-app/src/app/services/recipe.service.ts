import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';
import { Recipe } from '../models/recipe.model';
import { UtilitiesService } from './utilities.service';

@Injectable({
  providedIn: 'root'
})
export class RecipeService{

  currRecipe: Recipe | undefined
  currRecipeEmitter = new EventEmitter<Recipe>();
  private readonly CACHE_KEY = 'recipes_cache';
  private readonly CACHE_TIMESTAMP_KEY = 'recipes_cache_timestamp';
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

  constructor(
    private httpService: HttpService,
    private utils: UtilitiesService
  ) { }

  getAllRecipes(skip: number = 0, limit: number = 10): Observable<any> {
    let params = {
      skip,
      limit
    }

    return new Observable(observer => {
      this.httpService.getData('/recipes/', params).subscribe({
        next: (data) => {
          this.cacheRecipes(data);
          observer.next(data);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  getLatestRecipes(): Observable<Recipe[]> {
    return this.httpService.getData("/recipes/latest", {}) as Observable<Recipe[]>;
  }

  private getCachedRecipes(): any | null {
    const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
    const cachedData = localStorage.getItem(this.CACHE_KEY);

    if (!timestamp || !cachedData) {
      return null;
    }

    const now = new Date().getTime();
    const cacheTime = parseInt(timestamp);

    if (now - cacheTime > this.CACHE_DURATION) {
      // Cache expired
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
      return null;
    }

    return JSON.parse(cachedData);
  }

  private cacheRecipes(data: any): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(this.CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
  }

  getCurrRecipe(): Recipe | undefined {
    return this.currRecipe
  }

  clearCurrRecipe() {
    this.currRecipe = undefined
    this.currRecipeEmitter.emit(undefined)
  }

  setCurrRecipe(recipe: Recipe) {
    this.currRecipe = recipe
    this.currRecipeEmitter.emit(recipe)
  }

  redirectToRecipeChat(recipe: Recipe) {
    this.setCurrRecipe(recipe)
    this.utils.redirect_page_to('/chat')
  }

  askQuestion(recipe: Recipe, userQuestion: string) {
    return this.httpService.postData('/ai/ask-recipe-question', {"recipe": recipe, "question": [userQuestion]})
  }

  searchRecipes(query: string) {
    return this.httpService.getData('/ai/semantic-search', {query: query})
  }

  analyzeRecipe(recipe: Recipe) {
    return this.httpService.postData('/ai/analyze-recipe', recipe)
  }

  createRecipe(recipe: Recipe) {
    return this.httpService.postData('/recipes/', recipe)
  }

  parseRecipe(recipeText: string) {
    return this.httpService.postData('/ai/parse', { recipe_text: recipeText })
  }

  // New methods for managing favorites
  addFavorite(recipeId: string): Observable<any> {
    return this.httpService.postData(`/auth/me/save-recipe/${recipeId}`, {});
  }

  removeFavorite(recipeId: string): Observable<any> {
    return this.httpService.deleteData(`/auth/me/save-recipe/${recipeId}`);
  }

  getFavouriteIds() {
    return this.httpService.getData("/auth/me/save-recipe");
  }

  getFavourites() {
    return this.httpService.getData("/auth/me/saved-recipes") as Observable<Recipe[]>;
  }

}
