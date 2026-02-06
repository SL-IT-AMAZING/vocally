import { supabase } from "../supabase";

export const getSupabaseAuth = () => supabase.auth;
