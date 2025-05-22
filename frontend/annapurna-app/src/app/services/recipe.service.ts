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

  constructor(
    private httpService: HttpService,
    private utils: UtilitiesService
  ) { }


  getAllRecipes(): Observable<any> {
    return this.httpService.getData('/recipes/')
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
