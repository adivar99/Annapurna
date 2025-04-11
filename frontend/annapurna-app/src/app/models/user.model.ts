export interface User {
  email: string;
  username: string;
  full_name?: string;
  hashed_password: string;
  created_at: Date;
  updated_at: Date;
  saved_recipes: string[];
}