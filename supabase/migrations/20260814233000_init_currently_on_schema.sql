-- Currently On initial schema (mirrors remote migration init_currently_on_schema)

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tracked_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null,
  kind text not null check (kind in ('music', 'tv', 'movies', 'podcasts', 'books')),
  my_status text not null,
  my_rating integer not null default 0 check (my_rating >= 0 and my_rating <= 5),
  my_review text not null default '',
  recommended_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, item_id)
);

create index tracked_items_user_id_idx on public.tracked_items (user_id);

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null,
  kind text not null check (kind in ('music', 'tv', 'movies', 'podcasts', 'books')),
  name text not null,
  date_finished timestamptz not null default now(),
  personal_rating integer not null default 0 check (personal_rating >= 0 and personal_rating <= 5),
  created_at timestamptz not null default now(),
  unique (user_id, kind, item_id)
);

create index diary_entries_user_id_idx on public.diary_entries (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_user_unread_idx on public.notifications (user_id) where read = false;

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  item_kind text not null check (item_kind in ('music', 'tv', 'movies', 'podcasts', 'books')),
  item_id text not null,
  item_name text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index recommendations_created_at_idx on public.recommendations (created_at desc);
create index recommendations_author_id_idx on public.recommendations (author_id);

create table public.recommendation_reactions (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (recommendation_id, user_id, emoji)
);

create index recommendation_reactions_rec_idx on public.recommendation_reactions (recommendation_id);

create table public.recommendation_comments (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index recommendation_comments_rec_idx on public.recommendation_comments (recommendation_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger tracked_items_set_updated_at
  before update on public.tracked_items
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.tracked_items enable row level security;
alter table public.diary_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_reactions enable row level security;
alter table public.recommendation_comments enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "Users select own tracked items"
  on public.tracked_items for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own tracked items"
  on public.tracked_items for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own tracked items"
  on public.tracked_items for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own tracked items"
  on public.tracked_items for delete to authenticated using (auth.uid() = user_id);

create policy "Users select own diary"
  on public.diary_entries for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own diary"
  on public.diary_entries for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own diary"
  on public.diary_entries for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own diary"
  on public.diary_entries for delete to authenticated using (auth.uid() = user_id);

create policy "Users select own notifications"
  on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own notifications"
  on public.notifications for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own notifications"
  on public.notifications for delete to authenticated using (auth.uid() = user_id);

create policy "Authenticated users can read recommendations"
  on public.recommendations for select to authenticated using (true);
create policy "Users insert own recommendations"
  on public.recommendations for insert to authenticated with check (auth.uid() = author_id);
create policy "Users delete own recommendations"
  on public.recommendations for delete to authenticated using (auth.uid() = author_id);

create policy "Authenticated users can read reactions"
  on public.recommendation_reactions for select to authenticated using (true);
create policy "Users insert own reactions"
  on public.recommendation_reactions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own reactions"
  on public.recommendation_reactions for delete to authenticated using (auth.uid() = user_id);

create policy "Authenticated users can read comments"
  on public.recommendation_comments for select to authenticated using (true);
create policy "Users insert own comments"
  on public.recommendation_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own comments"
  on public.recommendation_comments for delete to authenticated using (auth.uid() = user_id);

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from authenticated;
