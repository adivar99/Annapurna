export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  imageUrl?: string | null;
  saved_recipes?: string[];
  created_at?: string;
  updated_at?: string;
}
