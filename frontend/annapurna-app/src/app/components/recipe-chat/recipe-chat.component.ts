import { Component, Input, OnInit } from '@angular/core';
import { Recipe } from 'src/app/models/recipe.model';
import { RecipeService } from 'src/app/services/recipe.service';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

@Component({
  selector: 'app-recipe-chat',
  templateUrl: './recipe-chat.component.html',
  styleUrls: ['./recipe-chat.component.scss']
})
export class RecipeChatComponent implements OnInit {
  messages: Message[] = [];
  userInput: string = '';
  recipe!: Recipe;
  isChatLoading: boolean = false;
  chatError = ""

  constructor(
    private recipeService: RecipeService
  ) {}

  ngOnInit(): void {
    this.recipe = this.recipeService.currRecipe!
    this.startConversation();
  }

  startConversation() {
    this.messages.push({ sender: 'ai', text: `Let's talk about how to cook ${this.recipe.title}.` });
    this.analyzeRecipe()
  }

  analyzeRecipe() {
    this.isChatLoading = true;
    this.recipeService.analyzeRecipe(this.recipe).subscribe({
      next: (resp: any) => {
        this.messages.push({ sender: 'ai', text: resp.response });
        this.isChatLoading = false
      },
      error: (err: any) => {
        this.isChatLoading = false
      }
    })
  }

  sendMessage() {
    if (this.userInput.trim()) {
      this.messages.push({ sender: 'user', text: this.userInput });
      this.isChatLoading = true;
      this.getAIResponse(this.userInput);
      this.userInput = '';
    }
  }

  getAIResponse(userMessage: string) {
    this.recipeService.askQuestion(this.recipe, userMessage).subscribe({
      next: (resp: any) => {
        this.messages.push({ sender: 'ai', text: resp.response });
        this.isChatLoading = false
      },
      error: (err: any) => {
        this.isChatLoading = false
      }
    })

  }

  setChatError(errStr: string) {
    this.chatError = errStr
    setTimeout(() => {
      this.chatError = "";
    }, 5000);
  }
}
