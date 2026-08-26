export interface ChatMessage {
  id?: string;
  session_id?: string;
  sender: 'user' | 'ai';
  text: string;
  created_at?: string;
  timestamp?: string;
}

export interface ChatSession {
  session_id: string;
  recipe_id?: string;
  recipe_title?: string;
  last_message?: string;
  updated_at: string;
}

export interface ChatSessionDetails {
  session_id: string;
  user_id: string;
  recipe_id?: string;
  recipe_title?: string;
  recipe?: any;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}
