const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let clientPromise: Promise<any> | null = null;

async function loadSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  if (!clientPromise) {
    clientPromise = import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm').then(({ createClient }) =>
      createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string)
    );
  }
  return clientPromise;
}

export async function getSupabase() {
  return loadSupabaseClient();
}
