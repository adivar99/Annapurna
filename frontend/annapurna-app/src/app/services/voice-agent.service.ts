import { Injectable } from '@angular/core';
import { HttpService } from './http.service';

type RealtimeSession = any;
type RealtimeAgent = any;

@Injectable({ providedIn: 'root' })
export class VoiceAgentService {
  private agent: RealtimeAgent | null = null;
  private session: RealtimeSession | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private http: HttpService) {}

  async start(): Promise<{
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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    // 3) Lazy import realtime library in browser
    // Using the documented import path from the SDK
    const mod: any = await import('@openai/agents/realtime');
    this.agent = new mod.RealtimeAgent({
      name: 'Assistant',
      instructions: 'You are a helpful assistant for cooking recipes.'
    });
    this.session = new mod.RealtimeSession(this.agent, {
      model: 'gpt-4o-realtime-preview-2025-06-03',
    });
    await this.session.connect({ apiKey: clientApiKey });

    return { analyser: this.analyser, audioContext: this.audioContext };
  }

  async stop(): Promise<void> {
    try {
      if (this.session) {
        await this.session.disconnect?.();
      }
    } finally {
      this.session = null;
      this.agent = null;
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
}


