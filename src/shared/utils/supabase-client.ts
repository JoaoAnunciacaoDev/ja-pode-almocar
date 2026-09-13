import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseClient() {
  if (browserClient !== undefined) return browserClient;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  browserClient = url && publishableKey ? createClient(url, publishableKey) : null;
  return browserClient;
}

export function requireSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.");
  return client;
}
