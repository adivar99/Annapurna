'use client';

import { ApiClient, apiWsBase } from './apiClient';

// Anu persona for voice sessions — mirrors the server-side prompt character.
const ANU_SYSTEM_INSTRUCTION =
  'You are Anu, a friendly, concise, and expert cooking assistant. ' +
  'You are guiding the user through cooking in real time, hands-free. ' +
  'Keep spoken answers short and conversational: a few sentences at most. ' +
  'Give substitutions, timing checks, and technique tips clearly and warmly. ' +
  'If the user asks something unrelated to food or cooking, gently steer back.';

/**
 * Serializes the recipe the user is viewing into the voice session's system
 * instruction, so Anu answers from it instead of guessing.
 */
function buildRecipeContext(recipe: {
  title?: string;
  description?: string;
  ingredients?: Array<{ name?: string; quantity?: number; unit?: string }>;
  instructions?: string[];
  prep_time?: number;
  cook_time?: number;
  servings?: number;
}): string {
  const lines: string[] = [];
  lines.push(
    `The user is currently cooking this recipe and you are their hands-free guide:`
  );
  if (recipe.title) lines.push(`Title: ${recipe.title}`);
  if (recipe.description) lines.push(`Description: ${recipe.description}`);
  if (recipe.prep_time || recipe.cook_time || recipe.servings) {
    lines.push(
      `Prep: ${recipe.prep_time ?? '?'} min, Cook: ${recipe.cook_time ?? '?'} min, Servings: ${recipe.servings ?? '?'}.`
    );
  }
  if (recipe.ingredients?.length) {
    lines.push('Ingredients:');
    for (const ing of recipe.ingredients) {
      const qty = [ing.quantity, ing.unit].filter(Boolean).join(' ');
      lines.push(`- ${[qty, ing.name].filter(Boolean).join(' ')}`);
    }
  }
  if (recipe.instructions?.length) {
    lines.push('Steps:');
    recipe.instructions.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  lines.push(
    'Answer questions using THIS recipe. Refer to steps by number. ' +
      'When the user seems to be mid-step, offer the next step proactively but briefly.'
  );
  return '\n\n' + lines.join('\n');
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const DEFAULT_MODEL = 'gemini-3.8-live';
const MIC_COLOR = '#f97316'; // Orange — the user's voice
const ANU_COLOR = '#38bdf8'; // Sky — Anu's voice

// Reconnect policy for session resumption: the Live API resets WebSocket
// connections roughly every 10 minutes and hard-limits sessions, so we
// reconnect with the latest resumption handle. The ephemeral token stays
// valid for reconnects until its expireTime, so past that we give up.
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 800;

interface GeminiServerContent {
  interrupted?: boolean;
  turnComplete?: boolean;
  generationComplete?: boolean;
  modelTurn?: {
    parts?: Array<{
      text?: string;
      inlineData?: { mimeType?: string; data?: string };
    }>;
  };
  inputTranscription?: { text?: string };
  outputTranscription?: { text?: string };
}

interface GeminiMessage {
  setupComplete?: unknown;
  serverContent?: GeminiServerContent;
  sessionResumptionUpdate?: { newHandle?: string; resumable?: boolean };
  goAway?: { timeLeft?: string };
  error?: { message?: string; code?: number };
}

export class VoiceAgentService {
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private playbackContext: AudioContext | null = null;
  private playbackAnalyser: AnalyserNode | null = null;
  private anuAnimationFrameId: number | null = null;
  private playbackTime = 0;
  private isRunning = false;
  private setupDone = false;
  private liveModel = DEFAULT_MODEL;

  // Session resumption state: the latest resumption handle from the server.
  // Reconnects reuse the same proxied connection parameters (the JWT is
  // re-sent on each connect; the proxy injects the Gemini key itself).
  private resumptionHandle: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  // In-progress turn transcripts, reset at each turnComplete.
  private userTranscript = '';
  private aiTranscript = '';

  // Echo suppression: while Anu's audio is scheduled on the speakers, stop
  // sending mic audio so Google can't hear her and answer herself in a loop.
  private anuSpeakingUntil = 0;
  private static readonly ECHO_GUARD_MS = 350;

  // Callbacks kept for reconnects.
  private onStatusChange?: (status: string) => void;
  private onTranscript?: (speaker: 'user' | 'ai', text: string, done: boolean) => void;

  // Recipe context for the current session, baked into the system
  // instruction so Anu knows what she's guiding the user through.
  private recipeContext = '';

  async start(
    canvas: HTMLCanvasElement,
    anuCanvas: HTMLCanvasElement,
    onStatusChange?: (status: string) => void,
    onTranscript?: (speaker: 'user' | 'ai', text: string, done: boolean) => void,
    recipe?: {
      title?: string;
      description?: string;
      ingredients?: Array<{ name?: string; quantity?: number; unit?: string }>;
      instructions?: string[];
      prep_time?: number;
      cook_time?: number;
      servings?: number;
    }
  ): Promise<void> {
    this.recipeContext = recipe ? buildRecipeContext(recipe) : '';
    try {
      this.isRunning = true;
      this.onStatusChange = onStatusChange;
      this.onTranscript = onTranscript;
      if (onStatusChange) onStatusChange('Connecting to voice assistant...');

      // 1. Configuration check: the backend only serves a real token shape
      // when GEMINI_API_KEY is set. (The proxy authenticates with the key
      // server-side; the browser never needs it.)
      const session = await ApiClient.post<{
        client_secret: string;
        expires_at?: number;
        model?: string;
      }>('/ai/realtime/session');

      if (
        !session?.client_secret ||
        session.client_secret === 'mock_client_secret_token'
      ) {
        throw new Error(
          'Realtime voice is not configured on the server (no GEMINI_API_KEY).'
        );
      }
      this.liveModel = session.model || DEFAULT_MODEL;

      // 2. Setup user microphone and visualizer. getUserMedia exists only
      // in secure contexts (https or localhost) — on plain-http LAN access
      // navigator.mediaDevices is undefined, so fail with a clear message.
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Microphone access requires a secure connection. Open the app via https:// or http://localhost ' +
          '(on Android Chrome you can allow this origin via chrome://flags "unsafely-treat-insecure-origin-as-secure").'
        );
      }
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Hardware/system echo cancellation stops speaker audio from
          // re-entering the mic in the first place — the software gate in
          // onaudioprocess is the second line of defense.
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.source.connect(this.analyser);

      this.drawWaveform(this.analyser, canvas, MIC_COLOR, (id) => {
        this.animationFrameId = id;
      });

      // 3. Connect to the Gemini Live API WebSocket (v1beta only).
      await this.openSocket(anuCanvas);

      if (onStatusChange) onStatusChange('Listening... Speak with Anu');
    } catch (error: any) {
      console.error('Voice agent start error:', error);
      this.stop();
      throw error;
    }
  }

  private openSocket(anuCanvas?: HTMLCanvasElement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (anuCanvas) {
        // (Re)start Anu's waveform on the fresh socket's audio.
        this.anuAnimationFrameId = null;
      }
      this.intentionalClose = false;

      // Connect through the backend's Live API proxy. The browser sends its
      // Annapurna JWT (query param — WebSocket cannot carry headers); the
      // Gemini key stays server-side. After the handshake the protocol is
      // the raw BidiGenerateContent wire format, piped verbatim by the proxy.
      const url =
        `${apiWsBase()}/api/ai/realtime/ws` +
        `?authorization=${encodeURIComponent(ApiClient.getToken() || '')}`;

      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.sendSetup();
      };

      ws.onmessage = async (event) => {
        // Google sends server messages as binary frames (Blobs); decode
        // before parsing. Text frames pass through unchanged.
        let raw: string;
        if (typeof event.data === 'string') {
          raw = event.data;
        } else if (event.data instanceof Blob) {
          raw = await event.data.text();
        } else if (event.data instanceof ArrayBuffer) {
          raw = new TextDecoder().decode(event.data);
        } else {
          return;
        }

        let msg: GeminiMessage;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }

        if (msg.setupComplete) {
          const firstConnect = !this.setupDone;
          this.setupDone = true;
          this.reconnectAttempts = 0;
          if (firstConnect) {
            this.startMicCapture();
            if (anuCanvas) {
              this.startAnuWaveform(anuCanvas);
            }
          }
          resolve();
          return;
        }

        if (msg.error) {
          console.error('Live API error:', msg.error);
          const err = new Error(msg.error.message || 'Live API error');
          if (!this.setupDone) {
            reject(err);
          } else {
            this.scheduleReconnect(`error: ${msg.error.message || 'unknown'}`);
          }
          return;
        }

        // Server hands us a resumption handle — keep the latest one.
        const res = msg.sessionResumptionUpdate;
        if (res?.resumable && res.newHandle) {
          this.resumptionHandle = res.newHandle;
          return;
        }

        // Server announces imminent termination — reconnect proactively
        // before it aborts, resuming from the latest handle.
        if (msg.goAway) {
          console.log('Live API goAway, reconnecting:', msg.goAway.timeLeft);
          this.scheduleReconnect('server goAway', 0);
          return;
        }

        const sc = msg.serverContent;
        if (!sc) return;

        if (sc.interrupted) {
          // User barged in — drop anything queued for playback.
          this.clearPlayback();
        }

        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) {
              this.enqueueAudio(part.inlineData.data);
            }
          }
        }

        // What Google heard from the mic — shown as the user's message.
        if (sc.inputTranscription?.text && this.onTranscript) {
          this.userTranscript += sc.inputTranscription.text;
          this.onTranscript('user', this.userTranscript, false);
        }

        // What Anu is saying — shown as her message while she speaks.
        if (sc.outputTranscription?.text && this.onTranscript) {
          this.aiTranscript += sc.outputTranscription.text;
          this.onTranscript('ai', this.aiTranscript, false);
        }

        if (sc.turnComplete) {
          this.playbackTime = 0;
          // Commit both sides of the turn as final messages.
          if (this.onTranscript) {
            if (this.userTranscript.trim()) {
              this.onTranscript('user', this.userTranscript.trim(), true);
            }
            if (this.aiTranscript.trim()) {
              this.onTranscript('ai', this.aiTranscript.trim(), true);
            }
          }
          this.userTranscript = '';
          this.aiTranscript = '';
        }
      };

      ws.onerror = () => {
        if (!this.setupDone) {
          reject(new Error('Could not reach the Gemini Live API.'));
        }
      };

      ws.onclose = (event) => {
        if (this.intentionalClose) return;
        if (!this.setupDone) {
          reject(
            new Error(
              `Voice connection closed before setup (code ${event.code})${event.reason ? `: ${event.reason}` : '.'}`
            )
          );
        } else if (this.isRunning) {
          // Unexpected drop (connection reset, network blip) — resume.
          this.scheduleReconnect(`connection closed (code ${event.code})`);
        }
      };
    });
  }

  private sendSetup(): void {
    const setup: Record<string, any> = {
      model: `models/${this.liveModel}`,
      // NOTE: speechConfig lives inside generationConfig on the v1beta wire
      // format; a top-level speechConfig is rejected with close code 1007
      // ("Unknown name \"speechConfig\" at 'setup'").
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
        },
      },
      systemInstruction: {
        parts: [{ text: ANU_SYSTEM_INSTRUCTION + this.recipeContext }],
      },
      outputAudioTranscription: {},
    };
    // First connect: {} enables resumption updates. Reconnect: pass the
    // latest handle to continue the same logical session.
    setup.sessionResumption = this.resumptionHandle
      ? { handle: this.resumptionHandle }
      : {};
    this.ws?.send(JSON.stringify({ setup }));
  }

  private scheduleReconnect(reason: string, delayMs = RECONNECT_DELAY_MS): void {
    if (!this.isRunning) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Voice reconnect gave up after', this.reconnectAttempts, 'tries:', reason);
      if (this.onStatusChange) this.onStatusChange('Connection lost.');
      this.stop();
      return;
    }

    this.reconnectAttempts += 1;
    if (this.onStatusChange) {
      this.onStatusChange('Reconnecting...');
    }

    // Detach the dying socket without triggering its onclose path again.
    if (this.ws) {
      this.intentionalClose = true;
      const old = this.ws;
      if (
        old.readyState === WebSocket.OPEN ||
        old.readyState === WebSocket.CONNECTING
      ) {
        old.close();
      }
      this.ws = null;
    }

    this.reconnectTimer = setTimeout(async () => {
      if (!this.isRunning) return;
      try {
        await this.openSocket();
        if (this.onStatusChange) this.onStatusChange('Listening... Speak with Anu');
      } catch (err) {
        console.error('Voice reconnect failed:', err);
        this.scheduleReconnect('reconnect attempt failed');
      }
    }, delayMs);
  }

  private startMicCapture(): void {
    if (!this.audioContext || !this.source || this.processor) return;

    // ScriptProcessor is deprecated but dependency-free and adequate here.
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor = processor;

    processor.onaudioprocess = (event) => {
      if (!this.isRunning || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      // Echo gate: Anu is audible right now (plus a short tail for reverb/
      // browser buffering) — drop this mic buffer so she can't hear herself.
      if (Date.now() < this.anuSpeakingUntil) {
        return;
      }
      const input = event.inputBuffer.getChannelData(0);

      // The ScriptProcessor runs at the AudioContext's native rate (usually
      // 48 kHz), but we label frames as 16 kHz — so resample properly or
      // Google hears a 3x-slowed, octave-low signal its VAD can't use.
      const resampled = this.resampleTo16k(input, this.audioContext!.sampleRate);

      // Float32 [-1,1] -> Int16 LE PCM
      const pcm = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        const s = Math.max(-1, Math.min(1, resampled[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const blob = this.bytesToBase64(new Uint8Array(pcm.buffer));
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: { mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`, data: blob },
          },
        })
      );
    };

    this.source.connect(processor);
    // ScriptProcessorNode only fires when connected to the graph; mute it so
    // captured mic audio can never reach the speakers.
    const mute = this.audioContext.createGain();
    mute.gain.value = 0;
    processor.connect(mute);
    mute.connect(this.audioContext.destination);
  }

  /**
   * Linear resampler: input rate -> 16 kHz. Good enough for speech (the
   * Live API only needs 16 kHz voice-band audio); avoids a worker or
   * OfflineAudioContext round-trip per buffer.
   */
  private resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
    if (fromRate === INPUT_SAMPLE_RATE) return input;
    const ratio = fromRate / INPUT_SAMPLE_RATE;
    const outLength = Math.floor(input.length / ratio);
    const out = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const a = input[idx] ?? 0;
      const b = input[idx + 1] ?? a;
      out[i] = a + (b - a) * frac;
    }
    return out;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk)) as any
      );
    }
    return btoa(binary);
  }

  private enqueueAudio(base64: string): void {
    if (!this.playbackContext) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioContextClass({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });
      // Analyser on the playback graph so Anu's voice gets its own waveform.
      this.playbackAnalyser = this.playbackContext.createAnalyser();
      this.playbackAnalyser.fftSize = 2048;
    }
    const ctx = this.playbackContext;
    const analyser = this.playbackAnalyser;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const binary = atob(base64);
    const pcm = new Int16Array(binary.length / 2);
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] =
        binary.charCodeAt(2 * i) | (binary.charCodeAt(2 * i + 1) << 8);
    }
    const float = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      float[i] = pcm[i] / 32768;
    }

    const buffer = ctx.createBuffer(1, float.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float, 0);
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    if (analyser) {
      sourceNode.connect(analyser);
      analyser.connect(ctx.destination);
    } else {
      sourceNode.connect(ctx.destination);
    }

    // Schedule back-to-back; reset on turnComplete or interruption.
    const startAt = Math.max(ctx.currentTime + 0.05, this.playbackTime);
    sourceNode.start(startAt);
    this.playbackTime = startAt + buffer.duration;

    // Extend the echo gate to cover everything currently scheduled.
    const endsAtMs = Date.now() + (this.playbackTime - ctx.currentTime) * 1000;
    this.anuSpeakingUntil = Math.max(this.anuSpeakingUntil, endsAtMs + VoiceAgentService.ECHO_GUARD_MS);
  }

  private startAnuWaveform(canvas: HTMLCanvasElement): void {
    this.drawPlaybackWaveform(canvas);
  }

  private drawPlaybackWaveform(canvas: HTMLCanvasElement): void {
    if (!this.isRunning) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!this.isRunning) return;
      this.anuAnimationFrameId = requestAnimationFrame(draw);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!this.playbackAnalyser) return;
      const bufferLength = this.playbackAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.playbackAnalyser.getByteTimeDomainData(dataArray);

      ctx.lineWidth = 2;
      ctx.strokeStyle = ANU_COLOR;
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }

  private drawWaveform(
    analyser: AnalyserNode,
    canvas: HTMLCanvasElement,
    strokeStyle: string,
    setRafId: (id: number) => void
  ): void {
    if (!this.isRunning) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isRunning || !this.analyser) return;
      setRafId(requestAnimationFrame(draw));

      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#1e293b'; // Slate background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeStyle;
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }

  private clearPlayback(): void {
    if (!this.playbackContext) return;
    this.playbackContext.close().catch(() => {});
    this.playbackContext = null;
    this.playbackAnalyser = null;
    this.playbackTime = 0;
    // Barge-in: mic gate opens again after a short tail.
    this.anuSpeakingUntil = Date.now() + VoiceAgentService.ECHO_GUARD_MS;
  }

  stop(): void {
    this.isRunning = false;
    this.setupDone = false;
    this.liveModel = DEFAULT_MODEL;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.resumptionHandle = null;
    this.userTranscript = '';
    this.aiTranscript = '';
    this.anuSpeakingUntil = 0;
    this.recipeContext = '';

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.anuAnimationFrameId) {
      cancelAnimationFrame(this.anuAnimationFrameId);
      this.anuAnimationFrameId = null;
    }

    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;

    if (this.ws) {
      this.intentionalClose = true;
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.clearPlayback();
  }
}

export const voiceAgentService = new VoiceAgentService();
export default voiceAgentService;
