import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export async function signIn(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return { error: new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o login.") };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return { error: new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o cadastro.") };
  }
  return supabase.auth.signUp({ email, password });
}