import { Component, OnInit } from '@angular/core';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { UtilitiesService } from 'src/app/services/utilities.service';
import { SpoonacularService } from 'src/app/services/spoonacular.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  recipes: Recipe[] = [];
  trendingRecipes: Recipe[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  isLoadingTrending: boolean = false;
  error: string | null = null;
  trendingError: string | null = null;

  constructor(
    private authService: AuthService,
    private recipeService: RecipeService,
    private spoonacularService: SpoonacularService,
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
    this.loadTrendingRecipes();
  }
  
  loadRecipes() {
    this.isLoading = true;
    this.error = null;
    this.recipeService.getLatestRecipes().subscribe({
      next: (recipes: Recipe[]) => {
        this.recipes = recipes;
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

  loadTrendingRecipes() {
    this.isLoadingTrending = true;
    this.trendingError = null;
    this.spoonacularService.getRandomRecipes().subscribe({
      next: (response: any) => {
        this.trendingRecipes = response.recipes.map((recipe: any) => ({
          // id: recipe.id.toString(),
          title: recipe.title,
          description: recipe.summary,
          instructions: recipe.analyzedInstructions[0]?.steps.map((step: any) => step.step) || [],
          ingredients: recipe.extendedIngredients.map((ing: any) => ({
            name: ing.name,
            quantity: ing.amount,
            unit: ing.unit,
            notes: ing.original
          })),
          prep_time: recipe.preparationMinutes || 0,
          cook_time: recipe.cookingMinutes || 0,
          servings: recipe.servings,
          difficulty: this.mapDifficulty(recipe.readyInMinutes),
          cuisine: recipe.cuisines?.[0],
          tags: recipe.dishTypes || [],
          created_at: new Date(),
          updated_at: new Date(),
          imageUrl: recipe.image,
          isFavorite: false
        }));
        this.isLoadingTrending = false;
      },
      error: (err: any) => {
        this.trendingError = 'Failed to load trending recipes. Please try again.';
        this.isLoadingTrending = false;
      }
    });
  }

  mapDifficulty(minutes: number): string {
    if (minutes <= 30) return 'Easy';
    if (minutes <= 60) return 'Medium';
    return 'Hard';
  }

  checkFavorites() {
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
