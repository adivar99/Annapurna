import { Component, Input, OnInit } from '@angular/core';
import { Recipe } from 'src/app/models/recipe.model';

@Component({
  selector: 'app-recipe-card',
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss']
})
export class RecipeCardComponent implements OnInit{
  @Input() recipe!: Recipe;

  ngOnInit(): void {
      
  }

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
}
