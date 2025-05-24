import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Recipe } from 'src/app/models/recipe.model';
import { RecipeService } from 'src/app/services/recipe.service';
import { UtilitiesService } from 'src/app/services/utilities.service';
import { ChatMessage, ChatService } from 'src/app/services/chat.service';
import { ChatSessionDetails } from 'src/app/services/chat.service';
import { SpeechService } from 'src/app/services/speech.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-recipe-chat',
  templateUrl: './recipe-chat.component.html',
  styleUrls: ['./recipe-chat.component.scss']
})
export class RecipeChatComponent implements OnInit, OnDestroy {
  messages: ChatMessage[] = [];
  userInput: string = '';
  recipe!: Recipe;
  isChatLoading: boolean = false;
  chatError = "";
  isListening: boolean = false;
  isSpeechSupported: boolean = false;
  private speechSubscription?: Subscription;

  constructor(
    private recipeService: RecipeService,
    private utils: UtilitiesService,
    private chatService: ChatService,
    private speechService: SpeechService
  ) {
    this.isSpeechSupported = this.speechService.isSpeechRecognitionSupported();
  }

  ngOnInit(): void {
    this.recipe = this.recipeService.currRecipe!;
    this.checkSession();
    this.setupSpeechRecognition();
  }

  ngOnDestroy(): void {
    this.speechSubscription?.unsubscribe();
    this.speechService.stopListening();
    this.speechService.stopSpeaking();
  }
  
  startConversation() {
    const message: ChatMessage = {
      sender: 'ai',
      text: `Let's talk about how to cook ${this.recipe.title}.`,
      timestamp: new Date().toString()
    };
    this.messages.push(message);
  }
  
  checkSession() {
    this.chatService.getSessionByRecipe(this.recipe.id).subscribe({
      next: (session: ChatSessionDetails | null) => {
        if(session != null) {
          this.messages = session.messages;
        } else {
          this.startConversation();
        }
      },
      error: (err: any) => {
        this.isChatLoading = false;
      }
    });
  }

  setupSpeechRecognition() {
    if (this.isSpeechSupported) {
      this.speechSubscription = this.speechService.getRecognitionObservable().subscribe(
        (transcript: string) => {
          this.userInput = transcript;
          this.sendMessage();
        }
      );
    }
  }

  toggleSpeechRecognition() {
    if (!this.isSpeechSupported) return;

    if (this.isListening) {
      this.speechService.stopListening();
    } else {
      this.speechService.startListening();
    }
    this.isListening = !this.isListening;
  }

  sendMessage() {
    if (this.userInput.trim()) {
      this.messages.push({ sender: 'user', text: this.userInput, timestamp: new Date().toString() });
      this.isChatLoading = true;
      this.getAIResponse(this.userInput);
      this.userInput = '';
    }
  }

  getAIResponse(userMessage: string) {
    this.recipeService.askQuestion(this.recipe, userMessage).subscribe({
      next: (resp: any) => {
        // const aiMessage = { sender: 'ai', text: resp.response, timestamp: new Date().toString() };
        this.messages.push({ sender: 'ai', text: resp.response, timestamp: new Date().toString() });
        this.isChatLoading = false;
        
        // Speak the AI response
        if (this.speechService.isSpeechSynthesisSupported()) {
          this.speechService.speak(resp.response);
        }
      },
      error: (err: any) => {
        this.isChatLoading = false;
      }
    });
  }

  setChatError(errStr: string) {
    this.chatError = errStr;
    setTimeout(() => {
      this.chatError = "";
    }, 5000);
  }

  closeSession() {
    this.chatService.getSessionByRecipe(this.recipe.id).subscribe({
      next: (session: ChatSessionDetails | null) => {
        if (session) {
          this.chatService.deleteSession(session.session_id).subscribe({
            next: () => {
              this.utils.redirect_page_to('/home');
            },
            error: (err: any) => {
              this.setChatError('Failed to close session');
            }
          });
        } else {
          this.utils.redirect_page_to('/home');
        }
      },
      error: (err: any) => {
        this.setChatError('Failed to close session');
      }
    });
  }

  goBack() {
    this.utils.redirect_page_to("/home");
  }
}
