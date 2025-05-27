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
  @Input() toCreate: boolean = false;

  constructor(
    private recipeService: RecipeService
  ) { }


  ngOnInit(): void { }

  toggleFavorite(recipe: Recipe) {
    console.log("Favouriting", recipe)
    if (!recipe.id) {
      console.error('Cannot favorite recipe without an ID.');
      return;
    }

    if (recipe.isFavorite) {
      // Currently favorited, so remove it
      this.recipeService.removeFavorite(recipe.id).subscribe({
        next: () => {
          recipe.isFavorite = false;
          console.log(`Recipe ${recipe.title} removed from favorites`);
        },
        error: (err) => {
          console.error(`Failed to remove recipe ${recipe.title} from favorites:`, err);
          // Optionally show an error message to the user
        }
      });
    } else {
      // Not favorited, so add it
      this.recipeService.addFavorite(recipe.id).subscribe({
        next: () => {
          recipe.isFavorite = true;
          console.log(`Recipe ${recipe.title} added to favorites`);
        },
        error: (err) => {
          console.error(`Failed to add recipe ${recipe.title} to favorites:`, err);
          // Optionally show an error message to the user
        }
      });
    }
  }

  redirectChat() {
    if (this.toCreate) {
      // Store recipe in our database
      this.recipeService.createRecipe(this.recipe).subscribe({
        next: (savedRecipe: any) => {
          this.recipeService.redirectToRecipeChat(savedRecipe)
        },
        error: (err) => {
          console.error('Failed to save recipe. Please try again.')
        }
      });
    } else {
      this.recipeService.redirectToRecipeChat(this.recipe)
    }
  }
}
