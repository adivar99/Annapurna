import { Component, OnInit } from '@angular/core';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { UtilitiesService } from 'src/app/services/utilities.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  recipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private recipeService: RecipeService,
    private utils: UtilitiesService
  ) {
    if (this.authService.isLoggedIn)
    this.authService.currentUser.subscribe({
      next: (user: User) => {
        // this.loadRecipes()
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
      next: (recipes: Recipe[]) => {
        this.recipes = recipes;
        this.filteredRecipes = recipes;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load recipes. Please try again.';
        this.isLoading = false;
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
}
