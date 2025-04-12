export interface Ingredient {
    name: string
    quantity: number
    unit: string
    notes: string | undefined
}

export interface Recipe {
    id: string
    title: string;
    description?: string;
    instructions: string[];
    ingredients: Ingredient[];
    prep_time: number; // in minutes
    cook_time: number; // in minutes
    servings: number;
    difficulty: string; // easy, medium, hard
    cuisine?: string;
    tags: string[];
    created_at: Date;
    updated_at: Date;
    author_id?: string; // ID of the user who created the recipe
    isFavorite: boolean
  }