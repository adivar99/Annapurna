import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Observable, map } from 'rxjs';
import { Recipe } from '../models/recipe.model';

export interface ChatSession {
  session_id: string;
  recipe_id: string;
  recipe_title: string;
  last_message: string | null;
  updated_at: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface ChatSessionDetails {
  session_id: string;
  recipe_id: string;
  recipe_title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private currentSessionId: string | null = null;

  constructor(private httpService: HttpService) {}

  createSession(recipe: Recipe): Observable<{ session_id: string }> {
    return this.httpService.postData('/chat/sessions', {
      recipe_id: recipe.id
    }).pipe(map(response => response as { session_id: string }));
  }

  getSessions(): Observable<ChatSession[]> {
    return this.httpService.getData('/chat/sessions').pipe(map(response => response as ChatSession[]));
  }

  getSession(sessionId: string): Observable<ChatSessionDetails> {
    return this.httpService.getData(`/chat/sessions/${sessionId}`).pipe(map(response => response as ChatSessionDetails));
  }

  getSessionByRecipe(recipe_id: string) {
    return this.httpService.getData(`/chat/recipe`,{recipe_id: recipe_id}).pipe(map(response => response as ChatSessionDetails));
  }

  addMessage(sessionId: string, message: string): Observable<{ status: string }> {
    return this.httpService.postData(`/chat/sessions/${sessionId}/messages`, {
      message
    }).pipe(map(response => response as { status: string }));
  }

  deleteSession(sessionId: string): Observable<{ status: string }> {
    return this.httpService.deleteData(`/chat/sessions/${sessionId}`).pipe(map(response => response as { status: string }));
  }

  setCurrentSession(sessionId: string | null) {
    this.currentSessionId = sessionId;
  }

  getCurrentSession(): string | null {
    return this.currentSessionId;
  }
} 