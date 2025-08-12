import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Recipe } from 'src/app/models/recipe.model';
import { RecipeService } from 'src/app/services/recipe.service';
import { UtilitiesService } from 'src/app/services/utilities.service';
import { ChatMessage, ChatService } from 'src/app/services/chat.service';
import { ChatSessionDetails } from 'src/app/services/chat.service';
import { Subscription } from 'rxjs';
import { VoiceAgentService } from 'src/app/services/agents/voice-agent.service';
import { NigellaAgentService } from 'src/app/services/agents/nigella-agent.service';

@Component({
  selector: 'app-recipe-chat',
  templateUrl: './recipe-chat.component.html',
  styleUrls: ['./recipe-chat.component.scss']
})
export class RecipeChatComponent implements OnInit, OnDestroy, AfterViewInit {
  messages: ChatMessage[] = [];
  userInput: string = '';
  recipe!: Recipe;
  isChatLoading: boolean = false;
  chatError = "";

  // Voice agent properties
  isVoiceAgentActive: boolean = false;
  private voiceMessageSubscription?: Subscription;
  private analyser?: AnalyserNode;
  private audioContext?: AudioContext;
  private animationFrameId: number | null = null;

  @ViewChild('waveCanvas') waveCanvasRef?: ElementRef<HTMLCanvasElement>;

  constructor(
    private recipeService: RecipeService,
    private utils: UtilitiesService,
    private chatService: ChatService,
    private voiceAgent: VoiceAgentService,
    private agentService: NigellaAgentService,
  ) {
      if (!this.agentService) {
        throw new Error('Nigella agent not available');
      }
  }

  ngOnInit(): void {
    this.recipe = this.recipeService.currRecipe!;
    this.checkSession();
  }

  ngOnDestroy(): void {
    this.voiceMessageSubscription?.unsubscribe();
    this.stopVoiceAgent();
  }

  ngAfterViewInit(): void {
    // Initialize after view is ready
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



  sendMessage() {
    if (this.userInput.trim()) {
      this.messages.push({ sender: 'user', text: this.userInput, timestamp: new Date().toString() });
      this.isChatLoading = true;
      this.getAIResponse(this.userInput);
      this.userInput = '';
    }
  }

  getAIResponse(userMessage: string) {
    this.agentService!.ask(userMessage).then((response) => {
      this.messages.push({ sender: 'ai', text: response.finalOutput!, timestamp: new Date().toString() });
      this.isChatLoading = false;
    }).catch((err: Error) => {
      console.log("Error Asking question: ", err.message);
      this.isChatLoading = false;
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
            error: () => {
              this.setChatError('Failed to close session');
            }
          });
        } else {
          this.utils.redirect_page_to('/home');
        }
      },
      error: () => {
        this.setChatError('Failed to close session');
      }
    });
  }

  goBack() {
    this.utils.redirect_page_to("/home");
  }

  async toggleVoiceAgent() {
    if (this.isVoiceAgentActive || this.voiceAgent.isActive()) {
      console.log("Stopping voice agent");
      await this.stopVoiceAgent();
      console.log("Voice agent stopped");
    } else {
      console.log("Starting voice agent");
      await this.startVoiceAgent();
      console.log("Voice agent started");
    }
  }

  private async startVoiceAgent() {
    try {
      const context = {
        recipe: {
          id: this.recipe.id,
          title: this.recipe.title,
          description: this.recipe.description,
          ingredients: this.recipe.ingredients,
          instructions: this.recipe.instructions,
        }
      };
      
      const { analyser, audioContext } = await this.voiceAgent.start(
        this.agentService.getVoiceAgent(),
        context
      );
      this.analyser = analyser;
      this.audioContext = audioContext;
      this.isVoiceAgentActive = true;
      this.startWaveform();

      // Subscribe to voice messages
      this.voiceMessageSubscription = this.voiceAgent.messages$.subscribe(
        (message) => {
          this.messages.push(message);
        }
      );
    } catch (err: any) {
      this.setChatError('Failed to start voice agent');
    }
  }

  private async stopVoiceAgent() {
    try {
      await this.voiceAgent.stop();
    } catch (error) {
      console.error('Error stopping voice agent:', error);
    }

    // Always update state regardless of errors
    this.isVoiceAgentActive = false;
    this.stopWaveform();

    // Unsubscribe from voice messages
    this.voiceMessageSubscription?.unsubscribe();
    this.voiceMessageSubscription = undefined;

    // Clear analyser and audio context
    this.analyser = undefined;
    this.audioContext = undefined;
  }

  private startWaveform() {
    if (!this.waveCanvasRef || !this.analyser) return;
    const canvas = this.waveCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      this.animationFrameId = requestAnimationFrame(draw);
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4CAF50';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
  }

  private stopWaveform() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const canvas = this.waveCanvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}
