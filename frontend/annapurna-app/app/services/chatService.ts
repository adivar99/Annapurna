import { ChatSession, ChatSessionDetails, ChatMessage } from '../models/chat';
import { ApiClient } from './apiClient';

class ChatService {
  /**
   * Get all chat sessions for the current user
   */
  async getSessions(): Promise<ChatSession[]> {
    try {
      return await ApiClient.get<ChatSession[]>('/chat/sessions');
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }
  }

  /**
   * Get a specific chat session with its messages
   */
  async getSession(id: string): Promise<ChatSessionDetails> {
    try {
      return await ApiClient.get<ChatSessionDetails>(`/chat/sessions/${id}`);
    } catch (error) {
      console.error('Error fetching chat session details:', error);
      throw error;
    }
  }

  /**
   * Get an existing chat session for a specific recipe
   */
  async getSessionByRecipe(recipeId: string): Promise<ChatSessionDetails | null> {
    try {
      return await ApiClient.get<ChatSessionDetails | null>(`/chat/recipe?recipe_id=${recipeId}`);
    } catch (error) {
      console.error('Error fetching session by recipe:', error);
      return null;
    }
  }

  /**
   * Create a new chat session for a recipe
   */
  async createSession(recipeId?: string): Promise<{ session_id: string }> {
    try {
      return await ApiClient.post<{ session_id: string }>('/chat/sessions', { recipe_id: recipeId });
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  /**
   * Add a message to an active chat session
   */
  async addMessage(sessionId: string, text: string, sender: 'user' | 'ai' = 'user'): Promise<ChatMessage> {
    try {
      return await ApiClient.post<ChatMessage>(`/chat/sessions/${sessionId}/messages`, {
        text,
        sender
      });
    } catch (error) {
      console.error('Error adding message to session:', error);
      throw error;
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await ApiClient.delete(`/chat/sessions/${sessionId}`);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
export default chatService;
