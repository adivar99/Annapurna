import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Subject } from 'rxjs';

type RealtimeSession = any;
type RealtimeAgent = any;

export interface VoiceMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class VoiceAgentService {
  private agent: RealtimeAgent | null = null;
  private session: RealtimeSession | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  
  // Observable for voice messages
  private messageSubject = new Subject<VoiceMessage>();
  public messages$ = this.messageSubject.asObservable();

  constructor(private http: HttpService) {}

  async start(context?: any, instructionsOverride?: string): Promise<{
    analyser: AnalyserNode;
    audioContext: AudioContext;
  }> {
    if (this.session) {
      return { analyser: this.analyser!, audioContext: this.audioContext! };
    }

    // 1) Fetch ephemeral token from backend
    const tokenResp = await this.http
      .postData('/ai/realtime/session', {})
      .toPromise() as any;
    const clientApiKey = tokenResp.client_secret as string;

    // 2) Ask for mic and setup analyser for waveform
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);

    // 3) Lazy import realtime library in browser
    // Using the documented import path from the SDK
    const mod: any = await import('@openai/agents-realtime');
    this.agent = new mod.RealtimeAgent({
      name: 'Anu',
      instructions:
        instructionsOverride ||
        'Your name is Anu. You are a helpful assistant for cooking recipes. Use the provided context to tailor your answers. Use expletives when appropriate.',
      tts: {
        voice: 'onyx',
        speed: 1.2,
      }
    });
    this.session = new mod.RealtimeSession(this.agent, {
      model: 'gpt-4o-realtime-preview-2025-06-03',
      context,
    });
    
    // Set up event listeners for transcription
    this.session.on('history_added', (item: any) => {
      if (item.type === 'message' && item.message?.content) {
        this.messageSubject.next({
          sender: 'ai',
          text: item.message.content,
          timestamp: new Date().toString()
        });
      }
    });
    
    this.session.on('transport_event', (event: any) => {
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        this.messageSubject.next({
          sender: 'user',
          text: event.transcript,
          timestamp: new Date().toString()
        });
      }
    });
    
    await this.session.connect({ apiKey: clientApiKey });

    return { analyser: this.analyser, audioContext: this.audioContext };
  }

  async stop(): Promise<void> {
    try {
      if (this.session) {
        // Remove event listeners first
        this.session.removeAllListeners?.();
        await this.session.disconnect?.();
      }
    } catch (error) {
      console.error('Error stopping session:', error);
    } finally {
      this.session = null;
      this.agent = null;
      
      // Stop all audio tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      if (this.source) {
        try { this.source.disconnect(); } catch {}
        this.source = null;
      }
      if (this.analyser) {
        try { this.analyser.disconnect(); } catch {}
        this.analyser = null;
      }
      if (this.audioContext) {
        try { this.audioContext.close(); } catch {}
        this.audioContext = null;
      }
    }
  }

  getAnalyser(): AnalyserNode | null { return this.analyser; }
  
  isActive(): boolean {
    return this.session !== null;
  }
}


