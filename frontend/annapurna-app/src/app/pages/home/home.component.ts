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
      }
    })
  }
  
  ngOnInit() {
    this.loadRecipes();
  }
  
  loadRecipes() {
    this.isLoading = true;
    this.error = null;
    this.recipeService.getLatestRecipes().subscribe({
      next: (recipes: Recipe[]) => {
        this.recipes = recipes;
        this.filteredRecipes = recipes;
        this.checkFavorites()
        this.isLoading = false;
        console.log("recipes loaded")
      },
      error: (err: any) => {
        this.error = 'Failed to load recipes. Please try again.';
        this.isLoading = false;
      }
    });
  }

  checkFavorites() {
    // let favouriteRecipeIds: string[] = []
    if (this.authService.user) {
      this.recipeService.getFavouriteIds().subscribe({
        next: (favourites: any) => {
          console.log("marking favourites: ", favourites)
          this.recipes.forEach((recipe) => {
            console.log(`is ${recipe.id} in ${favourites}`)
            if (favourites.includes(recipe.id)) {
              recipe.isFavorite = true;
            }
          });
        },
        error: (err) => {
          console.log("Error fetching user's favourite recipes")
        }
      })
    }
    
  }
}
