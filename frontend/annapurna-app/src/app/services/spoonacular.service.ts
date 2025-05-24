import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Observable, map } from 'rxjs';

interface SpoonacularRecipe {
  id: number;
  title: string;
  summary: string;
  analyzedInstructions: Array<{
    steps: Array<{
      step: string;
    }>;
  }>;
  extendedIngredients: Array<{
    name: string;
    amount: number;
    unit: string;
    original: string;
  }>;
  preparationMinutes: number;
  cookingMinutes: number;
  readyInMinutes: number;
  servings: number;
  cuisines: string[];
  dishTypes: string[];
  image: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpoonacularService {

  SPOONACULAR_API_URL = "https://api.spoonacular.com"
  SPOONACULAR_API_KEY = "260d38297d1e497f8e57e56e6e9271e6"

  constructor(
    private httpService: HttpService
  ) { }

  private doGetCall(requestStr: string, params: {[key: string]: any} = {}) {
    params["apiKey"] = this.SPOONACULAR_API_KEY;
    return this.httpService.getData(requestStr, params, true)
  }

  private doPostCall(requestStr: string, body: {[key: string]: any} = {}) {
    body["apiKey"] = this.SPOONACULAR_API_KEY;
    return this.httpService.postData(requestStr, body, true)
  }

  getRecipeInfo(recipeId: string): Observable<SpoonacularRecipe> {
    let requestStr = this.SPOONACULAR_API_URL + "/recipes/"+recipeId + "/information"
    return this.doGetCall(requestStr).pipe(map(response => response as SpoonacularRecipe));
  }

  getSearchRecipes(queryString: string) {
    let requestStr = this.SPOONACULAR_API_URL + "/recipes/complexSearch"
    let body = {query: queryString}
    return this.doPostCall(requestStr, body)
  }

  getRecipeAutocomplete(query: string, number: number = 5): Observable<any> {
    let params = {query, number}
    return this.doGetCall(`${this.SPOONACULAR_API_URL}/recipes/autocomplete`, params);
  }
}
