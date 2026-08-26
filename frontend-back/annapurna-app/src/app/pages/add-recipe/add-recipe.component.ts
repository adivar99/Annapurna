import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { Recipe, Ingredient } from '../../models/recipe.model';
import { UtilitiesService } from 'src/app/services/utilities.service';
import { catchError } from 'rxjs/operators'; // Import catchError
import { of } from 'rxjs'; // Import of

@Component({
  selector: 'app-add-recipe',
  templateUrl: './add-recipe.component.html',
  styleUrls: ['./add-recipe.component.scss']
})
export class AddRecipeComponent implements OnInit {

  @ViewChild('recipeForm') recipeForm!: NgForm;

  newRecipe: Recipe = {
    id: '',
    title: '',
    description: '',
    tags: [],
    ingredients: [],
    instructions: [],
    prep_time: 0,
    cook_time: 0,
    servings: 1,
    difficulty: '',
    imageUrl: '',
    isFavorite: false,
    created_at: new Date(),
    updated_at: new Date()
  };

  instructionStepInput: string = '';
  tagInput: string = '';
  ingredientInput: string = '';

  selectedImage: File | null = null;

  isSaving: boolean = false;
  isParseMode: boolean = false; // New property to track the mode
  rawRecipeText: string = ''; // New property to hold pasted text
  isParsing: boolean = false; // To show loading state during parsing
  parseError: string | null = null; // To display parsing errors


  constructor(
    private router: Router,
    private recipeService: RecipeService,
    private utils: UtilitiesService
  ) { }

  ngOnInit(): void {
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  addTag(): void {
    const input = this.tagInput.trim();
    if (input && !this.newRecipe.tags.includes(input)) {
      this.newRecipe.tags.push(input);
    }
    this.tagInput = '';
  }

  removeTag(tag: string): void {
    this.newRecipe.tags = this.newRecipe.tags.filter(t => t !== tag);
  }

  addInstructionStep(): void {
    const input = this.instructionStepInput.trim();
    if (input) {
      this.newRecipe.instructions.push(input);
      this.instructionStepInput = '';
    }
  }

  removeInstructionStep(index: number): void {
    this.newRecipe.instructions.splice(index, 1);
  }

  addIngredient(): void {
    const input = this.ingredientInput.trim();
    if (input) {
      const newIngredient: Ingredient = { name: input, quantity: 0, unit: '', notes: undefined };
      this.newRecipe.ingredients.push(newIngredient);
      this.ingredientInput = '';
    }
  }

  removeIngredient(index: number): void {
    this.newRecipe.ingredients.splice(index, 1);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedImage = file;
      console.log("Image selected:", file.name);
    }
  }

  selectDifficulty(difficulty: string): void {
    this.newRecipe.difficulty = difficulty;
  }

  toggleParseMode(): void {
      this.isParseMode = !this.isParseMode;
      // Optional: Reset form/parse text when toggling
      if (this.isParseMode) {
          // Reset form when switching to parse mode
          this.resetForm();
      } else {
          // Reset raw text and error when switching to manual mode
          this.rawRecipeText = '';
          this.parseError = null;
      }
  }

  parseRecipe(): void {
      if (!this.rawRecipeText.trim()) {
          this.parseError = 'Please paste recipe text to parse.';
          return;
      }

      this.isParsing = true;
      this.parseError = null;

      // Simulate backend call for parsing
      this.recipeService.parseRecipe(this.rawRecipeText).subscribe({
        next: (parsedRecipe: any) => {
          this.newRecipe = parsedRecipe;
          this.isParseMode = false;
        },
        error: (error: any) => {
          this.parseError = 'Failed to parse recipe. Please try again.';
          this.isParsing = false;
        }
      });
  }

      // Simulate a parsed recipe response
      // const simulatedParsedRecipe: Recipe = {
      //     id: '', // Backend would likely generate this
      //     title: 'Parsed Example Recipe',
      //     description: 'This is a recipe parsed from text.',
      //     tags: ['parsed', 'example'],
      //     ingredients: [{ name: 'Parsed Ingredient 1', quantity: 1, unit: 'cup', notes: undefined }, { name: 'Parsed Ingredient 2', quantity: 2, unit: '', notes: undefined }],
      //     instructions: ['Parsed step 1', 'Parsed step 2', 'Parsed step 3'],
      //     prep_time: 15,
      //     cook_time: 30,
      //     servings: 4,
      //     difficulty: 'medium',
      //     imageUrl: '', // If your parser extracts an image URL
      //     isFavorite: false,
      //     created_at: new Date(),
      //     updated_at: new Date()
      // };


      // // Simulate API call delay and response
      // of(simulatedParsedRecipe).pipe(
      //     catchError(err => {
      //         this.parseError = 'Failed to parse recipe. Please try again.';
      //         console.error('Parsing error:', err);
      //         return of(null); // Return null to stop the chain or handle appropriately
      //     })
      // ).subscribe(parsedRecipe => {
      //     this.isParsing = false;
      //     if (parsedRecipe) {
      //         // Populate the form with the parsed recipe data
      //         this.newRecipe = parsedRecipe;
      //         // Clear the raw text area after successful parsing
      //         this.rawRecipeText = '';
      //         // Switch back to manual mode to allow review/editing
      //         this.isParseMode = false;
      //         console.log('Recipe parsed and form populated.');
      //     }
      // });
  // }

   resetForm(): void {
        this.newRecipe = {
            id: '',
            title: '',
            description: '',
            tags: [],
            ingredients: [],
            instructions: [],
            prep_time: 0,
            cook_time: 0,
            servings: 1,
            difficulty: '',
            imageUrl: '',
            isFavorite: false,
            created_at: new Date(),
            updated_at: new Date()
        };
        this.ingredientInput = '';
        this.instructionStepInput = '';
        this.tagInput = '';
        this.selectedImage = null;
        if (this.recipeForm) {
             this.recipeForm.resetForm(this.newRecipe); // Reset form validation state
        }
   }


  onSubmit(): void {
    if (!this.recipeForm.valid || this.newRecipe.ingredients.length === 0 || this.newRecipe.instructions.length === 0) {
        console.log('Form is invalid. Cannot submit.');
        // Optionally display an error message to the user on the form
        return;
    }

    this.isSaving = true;

    console.log('Saving recipe:', this.newRecipe);

    this.recipeService.createRecipe(this.newRecipe).subscribe({
      next: (savedRecipe) => {
        console.log('Recipe saved successfully', savedRecipe);
        this.isSaving = false;
        this.utils.redirect_page_to('/home'); // Or navigate to the saved recipe's page
      },
      error: (error) => {
        console.error('Error saving recipe', error);
        this.isSaving = false;
        // Handle error (e.g., display a message to the user)
      }
    });
  }
}