-- Helpro TipTapp-like marketplace MVP schema
-- Base tables
create table if not exists provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  display_name text,
  photo_url text,
  area text,
  radius_km int default 10,
  services jsonb,
  languages jsonb,
  experience_years int,
  hourly_rate numeric,
  created_at timestamptz default now()
);

create table if not exists availability_rules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references provider_profiles(id) on delete cascade,
  day_of_week int check (day_of_week between 0 and 6),
  start_time text,
  end_time text
);

create table if not exists availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references provider_profiles(id) on delete cascade,
  date date,
  start_time text,
  end_time text,
  type text check (type in ('blocked','extra'))
);

create table if not exists customer_requests (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references auth.users not null,
  segment text check (segment in ('home','office','hotel')),
  service_type text,
  location text,
  time_window text,
  size text,
  details text,
  status text default 'open' check (status in ('open','confirmed','closed','cancelled')),
  created_at timestamptz default now()
);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references customer_requests(id) on delete cascade,
  provider_id uuid references provider_profiles(id) on delete cascade,
  price numeric,
  note text,
  eta text,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references customer_requests(id) on delete cascade,
  customer_user_id uuid references auth.users,
  provider_id uuid references provider_profiles(id),
  proposal_id uuid references proposals(id),
  start_at timestamptz,
  end_at timestamptz,
  price numeric,
  status text default 'confirmed' check (status in ('pending','confirmed','done','cancelled')),
  created_at timestamptz default now()
);

create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  customer_user_id uuid references auth.users,
  provider_user_id uuid references auth.users,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references chat_threads(id) on delete cascade,
  sender_user_id uuid references auth.users,
  text text,
  created_at timestamptz default now()
);

-- Suggested RLS policies (apply in Supabase SQL editor):
-- alter table provider_profiles enable row level security;
-- create policy "provider-profile-self" on provider_profiles for select using (auth.uid() = user_id);
-- create policy "provider-profile-write" on provider_profiles for insert with check (auth.uid() = user_id);
-- create policy "provider-profile-update" on provider_profiles for update using (auth.uid() = user_id);
-- Repeat participant-only policies for availability_rules, availability_exceptions, customer_requests,
-- proposals, bookings, chat_threads, and chat_messages to limit access to related users.
