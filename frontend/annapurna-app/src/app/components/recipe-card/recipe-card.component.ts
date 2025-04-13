import { Component, Input, OnInit } from '@angular/core';
import { Recipe } from 'src/app/models/recipe.model';
import { RecipeService } from 'src/app/services/recipe.service';

@Component({
  selector: 'app-recipe-card',
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss']
})
export class RecipeCardComponent implements OnInit{
  @Input() recipe!: Recipe;

  constructor(
    private recipeService: RecipeService
  ) { }


  ngOnInit(): void { }

  toggleFavorite(recipe: Recipe) {
    recipe.isFavorite = !recipe.isFavorite;
    if (recipe.isFavorite) {
      // TODO: Implement API call to save recipe to favorites
      console.log(`Recipe ${recipe.id} added to favorites`);
    } else {
      // TODO: Implement API call to remove recipe from favorites
      console.log(`Recipe ${recipe.id} removed from favorites`);
    }
  }

  redirectChat() {
    this.recipeService.redirectToRecipeChat(this.recipe)
  }
}
