import { getSupabase } from './supabase.ts';

export async function signInWithGoogle() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/app.html' } });
  if (error) throw error;
  return data;
}

export async function sendEmailOtp(email: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + '/auth.html' }
  });
  if (error) throw error;
  return true;
}

export async function verifyEmailOtp(email: string, token: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data;
}

export async function getSession() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function onAuthStateChange(callback: (event: string) => void) {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.onAuthStateChange((event) => callback(event));
  return data.subscription;
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
}

export async function updateUserMetadata(meta: Record<string, unknown>) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.updateUser({ data: meta });
  if (error) throw error;
  return data;
}
