import { Component, OnInit } from '@angular/core';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from 'src/app/models/recipe.model';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  recipes: Recipe[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private recipeService: RecipeService
  ) {
    if (this.authService.isLoggedIn)
    this.authService.currentUser.subscribe({
      next: (user: User) => {
        this.loadRecipes()
      }
    })
  }

  ngOnInit() {
    this.loadRecipes();
  }

  loadRecipes() {
    this.isLoading = true;
    this.error = null;

    this.recipeService.getAllRecipes().subscribe({
      next: (data: Recipe[]) => {
        this.recipes = data.map((recipe) => ({ ...recipe, isFavorite: false }));
        this.checkFavorites();
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load recipes. Please try again later.';
        this.isLoading = false;
        console.error('Error loading recipes:', error);
      }
    });
  }

  checkFavorites() {
    let favouriteRecipeIds: string[] = []
    if (this.authService.user) {
      favouriteRecipeIds = this.authService.user.saved_recipes
    }
    
    this.recipes.forEach((recipe) => {
      if (favouriteRecipeIds.includes(recipe.id)) {
        recipe.isFavorite = true;
      }
    });
  }

  redirect_recipe(recipe: Recipe) {}
}
