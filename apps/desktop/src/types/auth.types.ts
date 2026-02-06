// Custom AuthUser type that matches the structure expected by the app
// This bridges Supabase's User type with the app's existing expectations
export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
}
