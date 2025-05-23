import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { UtilitiesService } from 'src/app/services/utilities.service';
import { Recipe } from 'src/app/models/recipe.model';
import { User } from 'src/app/models/user.model';
import { RecipeService } from 'src/app/services/recipe.service';

@Component({
  selector: 'app-advanced-search',
  templateUrl: './advanced-search.component.html',
  styleUrls: ['./advanced-search.component.scss']
})
export class AdvancedSearchComponent {
  recipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  error: string | null = null;

  // Filter properties
  categories: string[] = []; // Will be populated dynamically with top 10 most frequent tags
  selectedCategory: string = 'All Recipes';

  cookingTimes = [
    { label: 'Any Time', value: null },
    { label: '< 15 minutes', value: 15 },
    { label: '15-30 minutes', value: 30 },
    { label: '30-60 minutes', value: 60 },
    { label: '> 60 minutes', value: Infinity }
  ];
  selectedCookingTime: number | null = null;

  difficultyLevels: string[] = ['Any Level', 'Easy', 'Medium', 'Hard'];
  selectedDifficulty: string = 'Any Level';

  constructor(
    private authService: AuthService,
    private recipeService: RecipeService,
    private utils: UtilitiesService
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
      next: (recipes: Recipe[]) => {
        this.recipes = recipes;
        this.filteredRecipes = recipes;
        this.isLoading = false;
        this.extractCategories(recipes); // Extract categories after loading
        this.filterRecipes(); // Apply initial filtering
      },
      error: (err: any) => {
        this.error = 'Failed to load recipes. Please try again.';
        this.isLoading = false;
      }
    });
  }

  extractCategories(recipes: Recipe[]) {
    const tagCounts: { [key: string]: number } = {};
    recipes.forEach(recipe => {
      recipe.tags.forEach(tag => {
        const lowerCaseTag = tag.toLowerCase();
        tagCounts[lowerCaseTag] = (tagCounts[lowerCaseTag] || 0) + 1;
      });
    });

    // Convert counts to an array of { tag: string, count: number } objects
    const sortedTags = Object.keys(tagCounts).map(tag => ({ tag, count: tagCounts[tag] }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // Take the top 10 tags and extract their names
    const top10Tags = sortedTags.slice(0, 10).map(item => item.tag);

    this.categories = ['All Recipes', ...top10Tags];
    this.selectedCategory = 'All Recipes'; // Reset selected category
  }

  filterRecipes() {
    let tempRecipes = this.recipes;

    // Apply search query filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      tempRecipes = tempRecipes.filter(recipe => 
        recipe.title.toLowerCase().includes(query) || 
        (recipe.description?.toLowerCase().includes(query) || false) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (this.selectedCategory !== 'All Recipes') {
      tempRecipes = tempRecipes.filter(recipe => 
        recipe.tags.some(tag => tag.toLowerCase() === this.selectedCategory.toLowerCase())
      );
    }

    // Apply cooking time filter
    if (this.selectedCookingTime !== null) {
      tempRecipes = tempRecipes.filter(recipe => {
        const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
        if (this.selectedCookingTime === 15) return totalTime < 15;
        if (this.selectedCookingTime === 30) return totalTime >= 15 && totalTime <= 30;
        if (this.selectedCookingTime === 60) return totalTime > 30 && totalTime <= 60;
        if (this.selectedCookingTime === Infinity) return totalTime > 60;
        return true; // Any Time
      });
    }

    // Apply difficulty level filter
    if (this.selectedDifficulty !== 'Any Level') {
      const selectedDifficultyNumber = this.mapDifficultyToNumber(this.selectedDifficulty);
      tempRecipes = tempRecipes.filter(recipe => 
        this.mapDifficultyToNumber(recipe.difficulty) === selectedDifficultyNumber
      );
    }

    this.filteredRecipes = tempRecipes;
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.filterRecipes();
  }

  selectCookingTime(time: number | null) {
    this.selectedCookingTime = time;
    this.filterRecipes();
  }

  selectDifficulty(difficulty: string) {
    this.selectedDifficulty = difficulty;
    this.filterRecipes();
  }

  // Helper to map difficulty strings to a comparable format (e.g., number of dots)
  mapDifficultyToNumber(difficulty: string | number | undefined): number | undefined {
    if (typeof difficulty === 'number') return difficulty; // Assuming recipe difficulty can also be a number (1, 2, 3)
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      default: return undefined;
    }
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

  logout() {
    this.authService.logout();
    this.utils.redirect_page_to('/login');
  }
}
