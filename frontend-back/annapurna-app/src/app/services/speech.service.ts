import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private recognitionSubject = new Subject<string>();

  private voices;

  constructor() {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-GB';

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.recognitionSubject.next(transcript);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }

    // Initialize speech synthesis
    this.synthesis = window.speechSynthesis;
    this.voices = this.synthesis.getVoices()
    console.log("Synth Voices:",this.synthesis.getVoices())
  }

  startListening(): void {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      this.recognition.start();
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  getRecognitionObservable() {
    return this.recognitionSubject.asObservable();
  }

  speak(text: string): void {
    if (this.synthesis) {
      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      // utterance.voice = 

      this.synthesis.speak(utterance);
    }
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  isSpeechRecognitionSupported(): boolean {
    return 'webkitSpeechRecognition' in window;
  }

  isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }
} 