import { EventEmitter, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
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

  getAllRecipes(): Observable<any> {
    const cachedData = this.getCachedRecipes();
    if (cachedData) {
      return of(cachedData);
    }

    return new Observable(observer => {
      this.httpService.getData('/recipes/').subscribe({
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

  analyzeRecipe(recipe: Recipe) {
    return this.httpService.postData('/ai/analyze-recipe', recipe)
  }

  createRecipe(recipe: Recipe) {
    return this.httpService.postData('/recipes/', recipe)
  }

  parseRecipe(recipeText: string) {
    return this.httpService.postData('/recipes/parse', { recipe_text: recipeText })
  }
}
