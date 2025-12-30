import { getSupabase } from './supabase.ts';

export type ProviderProfile = {
  id?: string;
  user_id?: string;
  display_name?: string;
  photo_url?: string;
  area?: string;
  radius_km?: number;
  services?: string[];
  languages?: string[];
  experience_years?: number;
  hourly_rate?: number;
};

export type AvailabilityRule = {
  id?: string;
  provider_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type AvailabilityException = {
  id?: string;
  provider_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  type: 'blocked' | 'extra';
};

export type CustomerRequest = {
  id?: string;
  customer_user_id?: string;
  segment?: string;
  service_type?: string;
  location?: string;
  time_window?: string;
  size?: string;
  details?: string;
  status?: string;
};

export type Proposal = {
  id?: string;
  request_id?: string;
  provider_id?: string;
  price?: number;
  note?: string;
  eta?: string;
};

export type Booking = {
  id?: string;
  request_id?: string;
  customer_user_id?: string;
  provider_id?: string;
  proposal_id?: string;
  start_at?: string;
  end_at?: string;
  price?: number;
  status?: string;
};

export type ChatThread = {
  id?: string;
  booking_id?: string;
  customer_user_id?: string;
  provider_user_id?: string;
};

export type ChatMessage = {
  id?: string;
  thread_id?: string;
  sender_user_id?: string;
  text?: string;
  created_at?: string;
};

export async function upsertProviderProfile(profile: ProviderProfile) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('provider_profiles').upsert(profile).select('*').maybeSingle();
  if (error) throw error;
  return data as ProviderProfile | null;
}

export async function fetchProviderProfile(userId: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('provider_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as ProviderProfile | null;
}

export async function saveAvailabilityRule(rule: AvailabilityRule) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('availability_rules').insert(rule).select('*').maybeSingle();
  if (error) throw error;
  return data as AvailabilityRule | null;
}

export async function saveAvailabilityException(exception: AvailabilityException) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('availability_exceptions').insert(exception).select('*').maybeSingle();
  if (error) throw error;
  return data as AvailabilityException | null;
}

export async function createCustomerRequest(request: CustomerRequest) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('customer_requests').insert(request).select('*').maybeSingle();
  if (error) throw error;
  return data as CustomerRequest | null;
}

export async function listOpenRequests() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('customer_requests').select('*').eq('status', 'open').order('created_at', { ascending: false });
  if (error) throw error;
  return data as CustomerRequest[];
}

export async function fetchRequestWithProposals(id: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('customer_requests')
    .select('*, proposals(*, provider:provider_id(display_name, languages, hourly_rate))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

export async function submitProposal(proposal: Proposal) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('proposals').insert(proposal).select('*').maybeSingle();
  if (error) throw error;
  return data as Proposal | null;
}

export async function confirmBooking(payload: Booking) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('bookings').insert(payload).select('*').maybeSingle();
  if (error) throw error;
  return data as Booking | null;
}

export async function updateRequestStatus(id: string, status: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('customer_requests').update({ status }).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data as CustomerRequest | null;
}

export async function createThread(thread: ChatThread) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('chat_threads').insert(thread).select('*').maybeSingle();
  if (error) throw error;
  return data as ChatThread | null;
}

export async function fetchThread(id: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('chat_threads').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as ChatThread | null;
}

export async function fetchMessages(threadId: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as ChatMessage[];
}

export async function sendMessage(message: ChatMessage) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('chat_messages').insert(message).select('*').maybeSingle();
  if (error) throw error;
  return data as ChatMessage | null;
}

export async function subscribeToMessages(threadId: string, onMessage: (msg: ChatMessage) => void) {
  const supabase = await getSupabase();
  const channel = supabase
    .channel(`thread-${threadId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` }, (payload: any) => {
      onMessage(payload.new as ChatMessage);
    })
    .subscribe();
  return channel;
}
