import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { UtilitiesService } from 'src/app/services/utilities.service';
import { Recipe } from 'src/app/models/recipe.model';
import { User } from 'src/app/models/user.model';
import { RecipeService } from 'src/app/services/recipe.service';
import { SpoonacularService } from 'src/app/services/spoonacular.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

interface AutocompleteSuggestion {
  id: number;
  title: string;
}

@Component({
  selector: 'app-advanced-search',
  templateUrl: './advanced-search.component.html',
  styleUrls: ['./advanced-search.component.scss']
})
export class AdvancedSearchComponent implements OnInit {
  recipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  error: string | null = null;
  autocompleteSuggestions: AutocompleteSuggestion[] = [];
  private searchSubject = new Subject<string>();

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
    private spoonacularService: SpoonacularService,
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

    // Set up autocomplete with debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length >= 2) {
          return this.spoonacularService.getRecipeAutocomplete(query);
        }
        return [];
      })
    ).subscribe({
      next: (suggestions) => {
        console.log("recieved auto-complete suggestions")
        console.log(suggestions)
        this.autocompleteSuggestions = suggestions.filter((suggestion: AutocompleteSuggestion) => !this.recipes.some(recipe => recipe.title.toLowerCase() === suggestion.title.toLowerCase()));
      },
      error: (error) => {
        console.error('Error fetching autocomplete suggestions:', error);
        this.autocompleteSuggestions = [];
      }
    });
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Check if the click was outside the search container
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer && !searchContainer.contains(event.target as Node)) {
      this.autocompleteSuggestions = [];
    }
  }

  onSearchInput(event: any) {
    const query = event.target.value;
    if (!query.trim()) {
      this.autocompleteSuggestions = [];
    }
    this.searchSubject.next(query);
  }

  selectSuggestion(suggestion: AutocompleteSuggestion) {
    this.isLoading = true;
    this.error = null;
    
    // Get recipe details from Spoonacular
    this.spoonacularService.getRecipeInfo(suggestion.id.toString()).subscribe({
      next: (recipeData) => {
        // Convert Spoonacular recipe to our Recipe model
        const recipe: Recipe = {
          id: '',
          title: recipeData.title,
          description: recipeData.summary,
          instructions: recipeData.analyzedInstructions[0]?.steps.map(step => step.step) || [],
          ingredients: recipeData.extendedIngredients.map(ing => ({
            name: ing.name,
            quantity: ing.amount,
            unit: ing.unit,
            notes: ing.original
          })),
          prep_time: recipeData.preparationMinutes || 0,
          cook_time: recipeData.cookingMinutes || 0,
          servings: recipeData.servings,
          difficulty: this.mapDifficulty(recipeData.readyInMinutes),
          cuisine: recipeData.cuisines?.[0] || undefined,
          tags: recipeData.dishTypes || [],
          created_at: new Date(),
          updated_at: new Date(),
          imageUrl: recipeData.image,
          isFavorite: false
        };

        // Store recipe in our database
        this.recipeService.createRecipe(recipe).subscribe({
          next: (savedRecipe: any) => {
            this.searchQuery = savedRecipe.title;
            this.autocompleteSuggestions = [];
            this.loadRecipes(); // Reload recipes to show the new one
            this.isLoading = false;
          },
          error: (err) => {
            this.error = 'Failed to save recipe. Please try again.';
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        this.error = 'Failed to fetch recipe details. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private mapDifficulty(readyInMinutes: number): string {
    if (readyInMinutes <= 30) return 'easy';
    if (readyInMinutes <= 60) return 'medium';
    return 'hard';
  }
}
