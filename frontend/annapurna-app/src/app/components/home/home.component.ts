import { Component, OnInit } from '@angular/core';
import { RecipeService, Recipe } from '../../services/recipe.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  recipes: Recipe[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private recipeService: RecipeService) {}

  ngOnInit() {
    this.loadRecipes();
  }

  loadRecipes() {
    this.isLoading = true;
    this.error = null;

    this.recipeService.getAllRecipes().subscribe({
      next: (data) => {
        this.recipes = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load recipes. Please try again later.';
        this.isLoading = false;
        console.error('Error loading recipes:', error);
      }
    });
  }
}
