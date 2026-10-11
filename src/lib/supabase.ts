import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        // Keep the user signed in across reloads/app restarts until they log out.
        // The session (incl. refresh token) is persisted in the browser and the
        // access token is refreshed automatically before it expires.
        persistSession: true,
        autoRefreshToken: true,
        // This app never receives sessions via a redirect URL, so don't scan the URL.
        detectSessionInUrl: false,
      },
    })
  : null;
