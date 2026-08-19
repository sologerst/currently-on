-- Community: profiles, follows, friendships, lists, scoped recs, avatars.

-- ---------------------------------------------------------------------------
-- Profile extras
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists handle text,
  add column if not exists bio text not null default '',
  add column if not exists avatar_path text,
  add column if not exists visibility text not null default 'public',
  add column if not exists invite_code text;

update public.profiles
set invite_code = encode(gen_random_bytes(5), 'hex')
where invite_code is null;

alter table public.profiles
  alter column invite_code set default encode(gen_random_bytes(5), 'hex'),
  alter column invite_code set not null;

alter table public.profiles
  drop constraint if exists profiles_visibility_check;
alter table public.profiles
  add constraint profiles_visibility_check
  check (visibility in ('public', 'friends', 'private'));

alter table public.profiles
  drop constraint if exists profiles_handle_format;
alter table public.profiles
  add constraint profiles_handle_format
  check (handle is null or handle ~ '^[a-z0-9_]{3,30}$');

create unique index if not exists profiles_handle_uidx
  on public.profiles (handle)
  where handle is not null;
create unique index if not exists profiles_invite_code_uidx
  on public.profiles (invite_code);

alter table public.tracked_items
  add column if not exists item_name text not null default '',
  add column if not exists image_url text;

alter table public.recommendations
  add column if not exists visibility text not null default 'friends',
  add column if not exists item_image_url text,
  add column if not exists pinned boolean not null default false;

alter table public.recommendations
  drop constraint if exists recommendations_visibility_check;
alter table public.recommendations
  add constraint recommendations_visibility_check
  check (visibility in ('public', 'friends', 'direct'));

alter table public.notifications
  add column if not exists link text;

-- ---------------------------------------------------------------------------
-- Social graph
-- ---------------------------------------------------------------------------

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_id_idx on public.follows (following_id);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_uidx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

create table if not exists public.recommendation_recipients (
  recommendation_id uuid not null references public.recommendations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recommendation_id, user_id)
);

create index if not exists recommendation_recipients_user_idx
  on public.recommendation_recipients (user_id);

-- ---------------------------------------------------------------------------
-- Lists (standard Currently On / Loving / Finished + custom mixed-media)
-- ---------------------------------------------------------------------------

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  slug text not null,
  kind text not null default 'custom' check (kind in ('standard', 'custom')),
  visibility text not null default 'public'
    check (visibility in ('private', 'friends', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create index if not exists lists_owner_id_idx on public.lists (owner_id);

create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  item_kind text not null check (item_kind in ('music', 'tv', 'movies', 'podcasts', 'books')),
  item_id text not null,
  item_name text not null,
  image_url text,
  note text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (list_id, item_kind, item_id)
);

create index if not exists list_items_list_id_idx on public.list_items (list_id, position);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a)
      )
  );
$$;

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'blocked'
      and (
        (f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a)
      )
  );
$$;

create or replace function public.can_view_profile(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = owner_id
      and (
        p.id = auth.uid()
        or p.visibility = 'public'
        or (
          p.visibility = 'friends'
          and auth.uid() is not null
          and public.are_friends(auth.uid(), p.id)
        )
      )
  );
$$;

create or replace function public.can_view_list(list_row public.lists)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    list_row.owner_id = auth.uid()
    or (
      public.can_view_profile(list_row.owner_id)
      and (
        list_row.visibility = 'public'
        or (
          list_row.visibility = 'friends'
          and auth.uid() is not null
          and public.are_friends(auth.uid(), list_row.owner_id)
        )
      )
    );
$$;

create or replace function public.can_view_recommendation(rec public.recommendations)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    rec.author_id = auth.uid()
    or (
      rec.visibility = 'public'
      and public.can_view_profile(rec.author_id)
    )
    or (
      rec.visibility = 'friends'
      and auth.uid() is not null
      and public.are_friends(auth.uid(), rec.author_id)
    )
    or (
      rec.visibility = 'direct'
      and auth.uid() is not null
      and exists (
        select 1
        from public.recommendation_recipients rr
        where rr.recommendation_id = rec.id
          and rr.user_id = auth.uid()
      )
    );
$$;

create or replace function public.normalize_handle(raw text)
returns text
language sql
immutable
as $$
  select left(regexp_replace(lower(coalesce(raw, '')), '[^a-z0-9_]', '', 'g'), 30);
$$;

create or replace function public.unique_handle(desired text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text := public.normalize_handle(desired);
  candidate text;
  n int := 0;
begin
  if length(base) < 3 then
    base := 'user';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles p where p.handle = candidate) loop
    n := n + 1;
    candidate := left(base, 24) || n::text;
  end loop;
  return candidate;
end;
$$;

create or replace function public.ensure_standard_lists(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lists (owner_id, title, description, slug, kind, visibility)
  values
    (p_user_id, 'Currently On', 'What I am in the middle of right now.', 'currently-on', 'standard', 'public'),
    (p_user_id, 'Loving', 'Things I really love — with a why.', 'loving', 'standard', 'public'),
    (p_user_id, 'Finished', 'What I have finished.', 'finished', 'standard', 'public')
  on conflict (owner_id, slug) do nothing;
end;
$$;

create or replace function public.notify_user(p_user_id uuid, p_text text, p_link text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_user_id = auth.uid() then
    return;
  end if;
  insert into public.notifications (user_id, text, link)
  values (p_user_id, p_text, p_link);
end;
$$;

-- ---------------------------------------------------------------------------
-- Signup: handle + invite + standard lists
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired text;
begin
  desired := coalesce(
    new.raw_user_meta_data->>'handle',
    split_part(coalesce(new.email, ''), '@', 1),
    'user'
  );

  insert into public.profiles (id, display_name, handle, invite_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    public.unique_handle(desired),
    encode(gen_random_bytes(5), 'hex')
  )
  on conflict (id) do nothing;

  perform public.ensure_standard_lists(new.id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Keep Currently On / Finished in sync with tracking + diary
-- ---------------------------------------------------------------------------

create or replace function public.is_currently_on_status(kind text, status text)
returns boolean
language sql
immutable
as $$
  select case
    when kind = 'tv' then status = 'watching'
    when kind = 'books' then status = 'reading'
    when kind = 'movies' then status = 'want'
    else status = 'following'
  end;
$$;

create or replace function public.sync_currently_on_from_tracked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  list_uuid uuid;
  live_kind text;
  live_item text;
  live_user uuid;
  live_status text;
  live_name text;
  live_image text;
begin
  live_user := coalesce(new.user_id, old.user_id);
  live_kind := coalesce(new.kind, old.kind);
  live_item := coalesce(new.item_id, old.item_id);

  select id into list_uuid
  from public.lists
  where owner_id = live_user and slug = 'currently-on';

  if list_uuid is null then
    perform public.ensure_standard_lists(live_user);
    select id into list_uuid
    from public.lists
    where owner_id = live_user and slug = 'currently-on';
  end if;

  if tg_op = 'DELETE' or not public.is_currently_on_status(live_kind, coalesce(new.my_status, '')) then
    delete from public.list_items
    where list_id = list_uuid
      and item_kind = live_kind
      and item_id = live_item;
    return coalesce(new, old);
  end if;

  live_status := new.my_status;
  live_name := coalesce(nullif(new.item_name, ''), live_item);
  live_image := new.image_url;

  insert into public.list_items (list_id, item_kind, item_id, item_name, image_url, position)
  values (list_uuid, live_kind, live_item, live_name, live_image, 0)
  on conflict (list_id, item_kind, item_id) do update
    set item_name = excluded.item_name,
        image_url = coalesce(excluded.image_url, public.list_items.image_url);

  return new;
end;
$$;

drop trigger if exists tracked_items_sync_currently_on on public.tracked_items;
create trigger tracked_items_sync_currently_on
  after insert or update or delete on public.tracked_items
  for each row execute function public.sync_currently_on_from_tracked();

create or replace function public.sync_finished_from_diary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  list_uuid uuid;
  live_user uuid;
  live_kind text;
  live_item text;
begin
  live_user := coalesce(new.user_id, old.user_id);
  live_kind := coalesce(new.kind, old.kind);
  live_item := coalesce(new.item_id, old.item_id);

  select id into list_uuid
  from public.lists
  where owner_id = live_user and slug = 'finished';

  if list_uuid is null then
    perform public.ensure_standard_lists(live_user);
    select id into list_uuid
    from public.lists
    where owner_id = live_user and slug = 'finished';
  end if;

  if tg_op = 'DELETE' then
    delete from public.list_items
    where list_id = list_uuid
      and item_kind = live_kind
      and item_id = live_item;
    return old;
  end if;

  insert into public.list_items (list_id, item_kind, item_id, item_name, note, position)
  values (list_uuid, new.kind, new.item_id, new.name, '', 0)
  on conflict (list_id, item_kind, item_id) do update
    set item_name = excluded.item_name;

  return new;
end;
$$;

drop trigger if exists diary_entries_sync_finished on public.diary_entries;
create trigger diary_entries_sync_finished
  after insert or update or delete on public.diary_entries
  for each row execute function public.sync_finished_from_diary();

-- ---------------------------------------------------------------------------
-- Social RPCs
-- ---------------------------------------------------------------------------

create or replace function public.request_friend(target_id uuid)
returns public.friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing public.friendships;
  actor text;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if target_id is null or target_id = me then
    raise exception 'Invalid friend';
  end if;
  if public.is_blocked(me, target_id) then
    raise exception 'Cannot add this person';
  end if;

  select * into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, target_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, target_id);

  if existing.id is not null then
    if existing.status = 'accepted' then
      return existing;
    end if;
    if existing.status = 'pending' and existing.addressee_id = me then
      update public.friendships
      set status = 'accepted'
      where id = existing.id
      returning * into existing;
      select coalesce(nullif(display_name, ''), handle, 'Someone') into actor
      from public.profiles where id = me;
      perform public.notify_user(
        existing.requester_id,
        actor || ' accepted your friend request',
        '/u/' || (select handle from public.profiles where id = me)
      );
      return existing;
    end if;
    return existing;
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (me, target_id, 'pending')
  returning * into existing;

  select coalesce(nullif(display_name, ''), handle, 'Someone') into actor
  from public.profiles where id = me;
  perform public.notify_user(
    target_id,
    actor || ' sent you a friend request',
    '/friends?tab=people'
  );
  return existing;
end;
$$;

create or replace function public.respond_friend(other_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing public.friendships;
  actor text;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  select * into existing
  from public.friendships f
  where f.status = 'pending'
    and f.addressee_id = me
    and f.requester_id = other_id;

  if existing.id is null then
    raise exception 'No pending request';
  end if;

  if accept then
    update public.friendships set status = 'accepted' where id = existing.id;
    select coalesce(nullif(display_name, ''), handle, 'Someone') into actor
    from public.profiles where id = me;
    perform public.notify_user(
      other_id,
      actor || ' accepted your friend request',
      '/u/' || (select handle from public.profiles where id = me)
    );
  else
    delete from public.friendships where id = existing.id;
  end if;
end;
$$;

create or replace function public.unfriend(other_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.friendships f
  where f.status in ('pending', 'accepted')
    and (
      (f.requester_id = me and f.addressee_id = other_id)
      or (f.requester_id = other_id and f.addressee_id = me)
    );
end;
$$;

create or replace function public.redeem_invite(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  inviter public.profiles;
  actor text;
  existing public.friendships;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  select * into inviter
  from public.profiles p
  where p.invite_code = lower(trim(code));

  if inviter.id is null then
    raise exception 'Invite not found';
  end if;
  if inviter.id = me then
    return me;
  end if;
  if public.is_blocked(me, inviter.id) then
    raise exception 'Cannot use this invite';
  end if;

  insert into public.follows (follower_id, following_id)
  values (me, inviter.id)
  on conflict do nothing;

  select * into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, inviter.id)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, inviter.id);

  if existing.id is null then
    insert into public.friendships (requester_id, addressee_id, status)
    values (me, inviter.id, 'accepted');
  elsif existing.status = 'pending' then
    update public.friendships set status = 'accepted' where id = existing.id;
  end if;

  select coalesce(nullif(display_name, ''), handle, 'Someone') into actor
  from public.profiles where id = me;
  perform public.notify_user(
    inviter.id,
    actor || ' joined via your invite',
    '/u/' || (select handle from public.profiles where id = me)
  );

  return inviter.id;
end;
$$;

create or replace function public.search_people(q text)
returns table (
  id uuid,
  handle text,
  display_name text,
  bio text,
  avatar_path text,
  visibility text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  needle text := trim(q);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if length(needle) < 2 then
    return;
  end if;

  return query
    select p.id, p.handle, p.display_name, p.bio, p.avatar_path, p.visibility
    from public.profiles p
    where p.id <> auth.uid()
      and p.handle is not null
      and public.can_view_profile(p.id)
      and (
        p.handle ilike needle || '%'
        or p.display_name ilike '%' || needle || '%'
      )
    order by
      case
        when p.handle = lower(needle) then 0
        when p.handle ilike needle || '%' then 1
        else 2
      end,
      p.display_name
    limit 20;
end;
$$;

create or replace function public.my_feed_ids()
returns table (id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select r.id
  from public.recommendations r
  where auth.uid() is not null
    and (
      r.author_id = auth.uid()
      or exists (
        select 1 from public.recommendation_recipients rr
        where rr.recommendation_id = r.id and rr.user_id = auth.uid()
      )
      or (
        r.visibility in ('public', 'friends')
        and public.are_friends(auth.uid(), r.author_id)
      )
      or (
        r.visibility = 'public'
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid()
            and f.following_id = r.author_id
        )
      )
    )
  order by r.created_at desc
  limit 80;
$$;

create or replace function public.find_profile_by_email(p_email text)
returns table (
  id uuid,
  handle text,
  display_name text,
  bio text,
  avatar_path text,
  visibility text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select u.id into uid
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if uid is null or uid = auth.uid() then
    return;
  end if;

  return query
    select p.id, p.handle, p.display_name, p.bio, p.avatar_path, p.visibility
    from public.profiles p
    where p.id = uid;
end;
$$;

-- Notify when someone follows you.
create or replace function public.on_follow_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
  actor_handle text;
begin
  select coalesce(nullif(display_name, ''), handle, 'Someone'), handle
    into actor, actor_handle
  from public.profiles where id = new.follower_id;
  perform public.notify_user(
    new.following_id,
    actor || ' followed you',
    '/u/' || coalesce(actor_handle, '')
  );
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.on_follow_insert();

-- Notify direct rec recipients.
create or replace function public.on_recipient_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.recommendations;
  actor text;
  actor_handle text;
begin
  select * into rec from public.recommendations where id = new.recommendation_id;
  select coalesce(nullif(display_name, ''), handle, 'Someone'), handle
    into actor, actor_handle
  from public.profiles where id = rec.author_id;
  perform public.notify_user(
    new.user_id,
    actor || ' recommended ' || rec.item_name,
    '/friends'
  );
  return new;
end;
$$;

drop trigger if exists recommendation_recipients_notify on public.recommendation_recipients;
create trigger recommendation_recipients_notify
  after insert on public.recommendation_recipients
  for each row execute function public.on_recipient_insert();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.follows enable row level security;
alter table public.friendships enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.recommendation_recipients enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Profiles are viewable when allowed" on public.profiles;
create policy "Profiles are viewable when allowed"
  on public.profiles for select
  to anon, authenticated
  using (public.can_view_profile(id));

drop policy if exists "Authenticated users can read recommendations" on public.recommendations;
drop policy if exists "Recommendations are readable in scope" on public.recommendations;
create policy "Recommendations are readable in scope"
  on public.recommendations for select
  to anon, authenticated
  using (public.can_view_recommendation(recommendations));

drop policy if exists "Users insert own recommendations" on public.recommendations;
create policy "Users insert own recommendations"
  on public.recommendations for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Users update own recommendations" on public.recommendations;
create policy "Users update own recommendations"
  on public.recommendations for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "Authenticated users can read reactions" on public.recommendation_reactions;
drop policy if exists "Reactions readable if rec is" on public.recommendation_reactions;
create policy "Reactions readable if rec is"
  on public.recommendation_reactions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id
        and public.can_view_recommendation(r)
    )
  );

drop policy if exists "Authenticated users can read comments" on public.recommendation_comments;
drop policy if exists "Comments readable if rec is" on public.recommendation_comments;
create policy "Comments readable if rec is"
  on public.recommendation_comments for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id
        and public.can_view_recommendation(r)
    )
  );

drop policy if exists "Follows readable" on public.follows;
create policy "Follows readable"
  on public.follows for select
  to anon, authenticated
  using (
    follower_id = auth.uid()
    or following_id = auth.uid()
    or public.can_view_profile(following_id)
    or public.can_view_profile(follower_id)
  );

drop policy if exists "Users follow as self" on public.follows;
create policy "Users follow as self"
  on public.follows for insert to authenticated
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
    and not public.is_blocked(follower_id, following_id)
  );

drop policy if exists "Users unfollow as self" on public.follows;
create policy "Users unfollow as self"
  on public.follows for delete to authenticated
  using (auth.uid() = follower_id);

drop policy if exists "Friendships visible to pair" on public.friendships;
create policy "Friendships visible to pair"
  on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "Lists readable when allowed" on public.lists;
create policy "Lists readable when allowed"
  on public.lists for select
  to anon, authenticated
  using (public.can_view_list(lists));

drop policy if exists "Users insert own lists" on public.lists;
create policy "Users insert own lists"
  on public.lists for insert to authenticated
  with check (auth.uid() = owner_id and kind = 'custom');

drop policy if exists "Users update own lists" on public.lists;
create policy "Users update own lists"
  on public.lists for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Users delete own custom lists" on public.lists;
create policy "Users delete own custom lists"
  on public.lists for delete to authenticated
  using (auth.uid() = owner_id and kind = 'custom');

drop policy if exists "List items readable when list is" on public.list_items;
create policy "List items readable when list is"
  on public.list_items for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id and public.can_view_list(l)
    )
  );

drop policy if exists "Users insert own list items" on public.list_items;
create policy "Users insert own list items"
  on public.list_items for insert to authenticated
  with check (
    exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
  );

drop policy if exists "Users update own list items" on public.list_items;
create policy "Users update own list items"
  on public.list_items for update to authenticated
  using (
    exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
  );

drop policy if exists "Users delete own list items" on public.list_items;
create policy "Users delete own list items"
  on public.list_items for delete to authenticated
  using (
    exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
  );

drop policy if exists "Recipients readable by author or recipient" on public.recommendation_recipients;
create policy "Recipients readable by author or recipient"
  on public.recommendation_recipients for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id and r.author_id = auth.uid()
    )
  );

drop policy if exists "Authors add recipients" on public.recommendation_recipients;
create policy "Authors add recipients"
  on public.recommendation_recipients for insert to authenticated
  with check (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id and r.author_id = auth.uid()
    )
  );

drop policy if exists "Authors remove recipients" on public.recommendation_recipients;
create policy "Authors remove recipients"
  on public.recommendation_recipients for delete to authenticated
  using (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id and r.author_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select on public.profiles to anon, authenticated;
grant select on public.lists to anon, authenticated;
grant select on public.list_items to anon, authenticated;
grant select on public.recommendations to anon, authenticated;
grant select on public.recommendation_reactions to anon, authenticated;
grant select on public.recommendation_comments to anon, authenticated;
grant select on public.follows to anon, authenticated;

grant select, insert, delete on public.follows to authenticated;
grant select on public.friendships to authenticated;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.list_items to authenticated;
grant select, insert, delete on public.recommendation_recipients to authenticated;

revoke all on function public.are_friends(uuid, uuid) from public;
revoke all on function public.is_blocked(uuid, uuid) from public;
revoke all on function public.can_view_profile(uuid) from public;
revoke all on function public.can_view_list(public.lists) from public;
revoke all on function public.can_view_recommendation(public.recommendations) from public;
revoke all on function public.normalize_handle(text) from public;
revoke all on function public.unique_handle(text) from public;
revoke all on function public.ensure_standard_lists(uuid) from public;
revoke all on function public.notify_user(uuid, text, text) from public;
revoke all on function public.request_friend(uuid) from public;
revoke all on function public.respond_friend(uuid, boolean) from public;
revoke all on function public.unfriend(uuid) from public;
revoke all on function public.redeem_invite(text) from public;
revoke all on function public.search_people(text) from public;
revoke all on function public.find_profile_by_email(text) from public;
revoke all on function public.my_feed_ids() from public;
revoke all on function public.is_currently_on_status(text, text) from public;

grant execute on function public.are_friends(uuid, uuid) to anon, authenticated;
grant execute on function public.is_blocked(uuid, uuid) to anon, authenticated;
grant execute on function public.can_view_profile(uuid) to anon, authenticated;
grant execute on function public.can_view_list(public.lists) to anon, authenticated;
grant execute on function public.can_view_recommendation(public.recommendations) to anon, authenticated;
grant execute on function public.normalize_handle(text) to authenticated;
grant execute on function public.request_friend(uuid) to authenticated;
grant execute on function public.respond_friend(uuid, boolean) to authenticated;
grant execute on function public.unfriend(uuid) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.search_people(text) to authenticated;
grant execute on function public.find_profile_by_email(text) to authenticated;
grant execute on function public.my_feed_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public avatars
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.follows;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.list_items;
alter publication supabase_realtime add table public.recommendation_recipients;
alter publication supabase_realtime add table public.notifications;

create or replace function public.lookup_invite(code text)
returns table (id uuid, handle text, display_name text, bio text, avatar_path text, visibility text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select p.id, p.handle, p.display_name, p.bio, p.avatar_path, p.visibility
    from public.profiles p
    where p.invite_code = lower(trim(code))
    limit 1;
end;
$$;

revoke all on function public.lookup_invite(text) from public;
grant execute on function public.lookup_invite(text) to anon, authenticated;
