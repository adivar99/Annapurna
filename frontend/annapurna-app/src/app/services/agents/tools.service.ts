import { Injectable } from '@angular/core';
import { SpoonacularService } from '../spoonacular.service';
import { RecipeService } from '../recipe.service';
import { tool } from '@openai/agents';
import { z } from 'zod';

@Injectable({
  providedIn: 'root',
})
export class ToolsService {
  private activeTimers: Map<number, any> = new Map();
  private timerIdCounter = 1;

  constructor(
    private recipeService: RecipeService,
    private spoonacularService: SpoonacularService
  ) {}
  public spoonacularTool = tool({
    name: 'spoonacular_search',
    description: 'Search for recipes using Spoonacular API',
    parameters: z.object({
      query: z.string().describe('The search query'),
    }),
    execute: async (input: any) => {
      const response = await this.spoonacularService
        .getSearchRecipes(input.query)
        .toPromise();
      return response;
    },
  });

  dBRecipeSearchTool = tool({
      name: 'recipe search',
      description: 'Search for recipes in the database',
      parameters: z.object({
        query: z.string().describe('The search query'),
      }),
      execute: async (input: any) => {
        const response = await this.recipeService
          .searchRecipes(input.query)
          .toPromise();
        return response;
      },
    });
  

  currentRecipeTool = tool({
      name: 'current_recipe',
      description: 'Get the current recipe',
      parameters: z.object({}),
      execute: async () => {
        return this.recipeService.getCurrRecipe();
      },
    });
  

  timerTool = tool({
      name: 'timer',
      description: 'Set a timer for a specified duration',
      parameters: z.object({
        duration: z.number().describe('The duration of the timer in seconds'),
      }),
      execute: async (input: any) => {
        setTimeout(() => {}, input.duration * 1000);
        this.activeTimers.set(
          this.timerIdCounter,
          setTimeout(() => {
            console.log('Timer done');
          }, input.duration * 1000)
        );
        this.timerIdCounter++;
        return 'Timer set for ' + input.duration + ' seconds';
      },
    });
  
}
