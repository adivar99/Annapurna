import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RecipeService } from '../../services/recipe.service'; // Assuming you have a RecipeService
import { Recipe } from '../../models/recipe.model'; // Assuming your Recipe model structure

@Component({
  selector: 'app-add-recipe',
  templateUrl: './add-recipe.component.html',
  styleUrls: ['./add-recipe.component.scss']
})
export class AddRecipeComponent implements OnInit {

  newRecipe: Recipe = { // Initialize with default values
    id: '', // You might generate this on the backend or before saving
    title: '',
    description: '',
    tags: [],
    ingredients: [], // Will be parsed from textarea
    instructions: [], // Will be parsed from textarea
    prep_time: 0,
    cook_time: 0,
    servings: 1,
    difficulty: '', // Initialize as empty string for no selection
    imageUrl: '', // Optional
    isFavorite: false, // Default to false
    created_at: new Date(),
    updated_at: new Date()
  };

  ingredientsInput: string = '';
  instructionsInput: string = '';
  tagInput: string = '';
  selectedImage: File | null = null; // For image upload

  isSaving: boolean = false;

  constructor(
    private router: Router,
    private recipeService: RecipeService // Inject your RecipeService
  ) { }

  ngOnInit(): void {
  }

  goBack(): void {
    this.router.navigate(['/']); // Navigate back to the home page
  }

  addTag(): void {
    const input = this.tagInput.trim();
    if (input && !this.newRecipe.tags.includes(input)) {
      this.newRecipe.tags.push(input);
    }
    this.tagInput = ''; // Clear the input
  }

  removeTag(tag: string): void {
    this.newRecipe.tags = this.newRecipe.tags.filter(t => t !== tag);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedImage = file;
      // You'll need logic to upload this file and get a URL later
      console.log("Image selected:", file.name);
    }
  }

  selectDifficulty(difficulty: string): void {
    this.newRecipe.difficulty = difficulty;
  }

  onSubmit(): void {
    this.isSaving = true;

    // Parse ingredients and instructions from textareas
    this.newRecipe.ingredients = this.ingredientsInput.split('\\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => ({ name: line, quantity: 0, unit: '', notes: undefined })); // Map string to Ingredient object

    this.newRecipe.instructions = this.instructionsInput.split('\\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log('Saving recipe:', this.newRecipe);

    // Here you would typically call a service to save the recipe
    // Example:
    // this.recipeService.createRecipe(this.newRecipe).subscribe({
    //   next: (savedRecipe) => {
    //     console.log('Recipe saved successfully', savedRecipe);
    //     this.isSaving = false;
    //     this.router.navigate(['/recipe', savedRecipe.id]); // Navigate to the new recipe page
    //   },
    //   error: (error) => {
    //     console.error('Error saving recipe', error);
    //     this.isSaving = false;
    //     // Handle error (e.g., show a message)
    //   }
    // });

    // For now, just simulate saving and navigate back
    setTimeout(() => {
      this.isSaving = false;
      console.log('Simulated save complete.');
      this.router.navigate(['/']); // Navigate back to home or to the new recipe page
    }, 2000);
  }
}