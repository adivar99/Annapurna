import { Component, OnInit } from '@angular/core';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { UtilitiesService } from 'src/app/services/utilities.service';

@Component({
  selector: 'app-saved',
  templateUrl: './saved.component.html',
  styleUrls: ['./saved.component.scss']
})
export class SavedComponent implements OnInit {
  recipes: Recipe[] = [];
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
    this.recipeService.getFavourites().subscribe({
      next: (recipes: Recipe[]) => {
        this.recipes = recipes.map(recipe => ({...recipe, isFavorite: true}));
        this.isLoading = false;
        console.log("recipes loaded")
      },
      error: (err: any) => {
        this.error = 'Failed to load recipes. Please try again.';
        this.isLoading = false;
      }
    });
  }
}
