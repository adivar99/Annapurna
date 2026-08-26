'use client';

import { ApiClient } from './apiClient';

export class VoiceAgentService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;

  async start(
    canvas: HTMLCanvasElement,
    onStatusChange?: (status: string) => void
  ): Promise<void> {
    try {
      this.isRunning = true;
      if (onStatusChange) onStatusChange('Connecting to voice assistant...');

      // 1. Fetch ephemeral token from backend
      const { client_secret } = await ApiClient.post<{ client_secret: string }>('/ai/realtime/session');
      console.log('Realtime voice session created:', client_secret ? 'Token received' : 'No token');

      // 2. Setup user microphone and visualizer
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      this.drawWaveform(canvas);

      if (onStatusChange) onStatusChange('Listening... Speak with Anu');
    } catch (error: any) {
      console.error('Voice agent start error:', error);
      this.stop();
      throw error;
    }
  }

  private drawWaveform(canvas: HTMLCanvasElement): void {
    if (!this.analyser || !this.isRunning) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isRunning || !this.analyser) return;
      this.animationFrameId = requestAnimationFrame(draw);

      this.analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#1e293b'; // Slate background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f97316'; // Orange waveform
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

  stop(): void {
    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.analyser = null;
  }
}

export const voiceAgentService = new VoiceAgentService();
export default voiceAgentService;
