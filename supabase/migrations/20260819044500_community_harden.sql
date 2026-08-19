-- Harden community: private helpers, invite secrecy, authz fixes, constraints.

-- ---------------------------------------------------------------------------
-- Private schema for SECURITY DEFINER helpers (not exposed via PostgREST)
-- ---------------------------------------------------------------------------

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, anon, authenticated, service_role;

create or replace function private.is_blocked(a uuid, b uuid)
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

create or replace function private.are_friends(a uuid, b uuid)
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

create or replace function private.can_view_profile(owner_id uuid)
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
        or (
          (auth.uid() is null or not private.is_blocked(auth.uid(), p.id))
          and (
            p.visibility = 'public'
            or (
              p.visibility = 'friends'
              and auth.uid() is not null
              and private.are_friends(auth.uid(), p.id)
            )
          )
        )
      )
  );
$$;

create or replace function private.can_view_list(list_row public.lists)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    list_row.owner_id = auth.uid()
    or (
      private.can_view_profile(list_row.owner_id)
      and (
        list_row.visibility = 'public'
        or (
          list_row.visibility = 'friends'
          and auth.uid() is not null
          and private.are_friends(auth.uid(), list_row.owner_id)
        )
      )
    );
$$;

create or replace function private.can_view_recommendation(rec public.recommendations)
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
      and private.can_view_profile(rec.author_id)
    )
    or (
      rec.visibility = 'friends'
      and auth.uid() is not null
      and private.are_friends(auth.uid(), rec.author_id)
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

create or replace function private.notify_user(p_user_id uuid, p_text text, p_link text default null)
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

grant execute on function private.is_blocked(uuid, uuid) to anon, authenticated, service_role;
grant execute on function private.are_friends(uuid, uuid) to anon, authenticated, service_role;
grant execute on function private.can_view_profile(uuid) to anon, authenticated, service_role;
grant execute on function private.can_view_list(public.lists) to anon, authenticated, service_role;
grant execute on function private.can_view_recommendation(public.recommendations) to anon, authenticated, service_role;
revoke all on function private.notify_user(uuid, text, text) from public;
revoke all on function private.notify_user(uuid, text, text) from anon, authenticated;

-- Point public wrappers at private (then drop public RPC exposure)
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select private.is_blocked(a, b); $$;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select private.are_friends(a, b); $$;

create or replace function public.can_view_profile(owner_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select private.can_view_profile(owner_id); $$;

create or replace function public.can_view_list(list_row public.lists)
returns boolean language sql stable security definer set search_path = public
as $$ select private.can_view_list(list_row); $$;

create or replace function public.can_view_recommendation(rec public.recommendations)
returns boolean language sql stable security definer set search_path = public
as $$ select private.can_view_recommendation(rec); $$;

-- Update RLS policies to use private.* (avoids public RPC surface for helpers)
drop policy if exists "Profiles are viewable when allowed" on public.profiles;
create policy "Profiles are viewable when allowed"
  on public.profiles for select
  to anon, authenticated
  using (private.can_view_profile(id));

drop policy if exists "Recommendations are readable in scope" on public.recommendations;
create policy "Recommendations are readable in scope"
  on public.recommendations for select
  to anon, authenticated
  using (private.can_view_recommendation(recommendations));

drop policy if exists "Reactions readable if rec is" on public.recommendation_reactions;
create policy "Reactions readable if rec is"
  on public.recommendation_reactions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id
        and private.can_view_recommendation(r)
    )
  );

drop policy if exists "Comments readable if rec is" on public.recommendation_comments;
create policy "Comments readable if rec is"
  on public.recommendation_comments for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id
        and private.can_view_recommendation(r)
    )
  );

drop policy if exists "Follows readable" on public.follows;
create policy "Follows readable"
  on public.follows for select
  to anon, authenticated
  using (
    follower_id = auth.uid()
    or following_id = auth.uid()
    or private.can_view_profile(following_id)
    or private.can_view_profile(follower_id)
  );

drop policy if exists "Users follow as self" on public.follows;
create policy "Users follow as self"
  on public.follows for insert to authenticated
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
    and not private.is_blocked(follower_id, following_id)
  );

drop policy if exists "Lists readable when allowed" on public.lists;
create policy "Lists readable when allowed"
  on public.lists for select
  to anon, authenticated
  using (private.can_view_list(lists));

drop policy if exists "List items readable when list is" on public.list_items;
create policy "List items readable when list is"
  on public.list_items for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id and private.can_view_list(l)
    )
  );

-- Reactions / comments only on recs the viewer can see
drop policy if exists "Users insert own reactions" on public.recommendation_reactions;
create policy "Users insert own reactions"
  on public.recommendation_reactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id
        and private.can_view_recommendation(r)
        and not private.is_blocked(auth.uid(), r.author_id)
    )
  );

drop policy if exists "Users insert own comments" on public.recommendation_comments;
create policy "Users insert own comments"
  on public.recommendation_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and char_length(trim(text)) between 1 and 1000
    and exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id
        and private.can_view_recommendation(r)
        and not private.is_blocked(auth.uid(), r.author_id)
    )
  );

-- Recipients: no self, no blocked
drop policy if exists "Authors add recipients" on public.recommendation_recipients;
create policy "Authors add recipients"
  on public.recommendation_recipients for insert to authenticated
  with check (
    user_id <> auth.uid()
    and not private.is_blocked(auth.uid(), user_id)
    and exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id and r.author_id = auth.uid()
    )
  );

-- Drop public helper RPCs so they are not callable via /rest/v1/rpc
drop function if exists public.is_blocked(uuid, uuid);
drop function if exists public.are_friends(uuid, uuid);
drop function if exists public.can_view_profile(uuid);
drop function if exists public.can_view_list(public.lists);
drop function if exists public.can_view_recommendation(public.recommendations);

-- Keep notify_user only as private
drop function if exists public.notify_user(uuid, text, text);

-- ---------------------------------------------------------------------------
-- Invite code secrecy + stronger codes
-- ---------------------------------------------------------------------------

alter table public.profiles
  alter column invite_code set default encode(extensions.gen_random_bytes(12), 'hex');

update public.profiles
set invite_code = encode(extensions.gen_random_bytes(12), 'hex')
where char_length(invite_code) < 16;

revoke select (invite_code) on table public.profiles from anon, authenticated;
revoke update (invite_code) on table public.profiles from anon, authenticated;

create or replace function public.my_invite_code()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select invite_code into code from public.profiles where id = auth.uid();
  return code;
end;
$$;

create or replace function public.rotate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text := encode(extensions.gen_random_bytes(12), 'hex');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles set invite_code = code where id = auth.uid();
  return code;
end;
$$;

revoke all on function public.my_invite_code() from public;
revoke all on function public.rotate_invite_code() from public;
grant execute on function public.my_invite_code() to authenticated;
grant execute on function public.rotate_invite_code() to authenticated;

-- ---------------------------------------------------------------------------
-- ensure_standard_lists: only for self
-- ---------------------------------------------------------------------------

create or replace function public.ensure_standard_lists(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not allowed';
  end if;
  insert into public.lists (owner_id, title, description, slug, kind, visibility)
  values
    (p_user_id, 'Currently On', 'What I am in the middle of right now.', 'currently-on', 'standard', 'public'),
    (p_user_id, 'Loving', 'Things I really love — with a why.', 'loving', 'standard', 'public'),
    (p_user_id, 'Finished', 'What I have finished.', 'finished', 'standard', 'public')
  on conflict (owner_id, slug) do nothing;
end;
$$;

-- Signup trigger must still create lists (runs as definer, auth.uid() null)
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
    nullif(trim(new.raw_user_meta_data->>'handle'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'user'
  );

  insert into public.profiles (id, display_name, handle, invite_code)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'display_name', ''), 80),
    public.unique_handle(desired),
    encode(extensions.gen_random_bytes(12), 'hex')
  )
  on conflict (id) do nothing;

  insert into public.lists (owner_id, title, description, slug, kind, visibility)
  values
    (new.id, 'Currently On', 'What I am in the middle of right now.', 'currently-on', 'standard', 'public'),
    (new.id, 'Loving', 'Things I really love — with a why.', 'loving', 'standard', 'public'),
    (new.id, 'Finished', 'What I have finished.', 'finished', 'standard', 'public')
  on conflict (owner_id, slug) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Email lookup: no private-profile leak / no blocked
-- ---------------------------------------------------------------------------

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
  if private.is_blocked(auth.uid(), uid) then
    return;
  end if;
  -- Only return if the viewer may see the profile (never private strangers)
  if not private.can_view_profile(uid) then
    return;
  end if;

  return query
    select p.id, p.handle, p.display_name, p.bio, p.avatar_path, p.visibility
    from public.profiles p
    where p.id = uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Friend / invite RPCs use private.notify_user + private.is_blocked
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
  if me is null then raise exception 'Not authenticated'; end if;
  if target_id is null or target_id = me then raise exception 'Invalid friend'; end if;
  if private.is_blocked(me, target_id) then raise exception 'Cannot add this person'; end if;

  select * into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, target_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, target_id);

  if existing.id is not null then
    if existing.status = 'accepted' then return existing; end if;
    if existing.status = 'blocked' then raise exception 'Cannot add this person'; end if;
    if existing.status = 'pending' and existing.addressee_id = me then
      update public.friendships set status = 'accepted' where id = existing.id returning * into existing;
      select coalesce(nullif(display_name, ''), handle, 'Someone') into actor from public.profiles where id = me;
      perform private.notify_user(
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

  select coalesce(nullif(display_name, ''), handle, 'Someone') into actor from public.profiles where id = me;
  perform private.notify_user(target_id, actor || ' sent you a friend request', '/friends?tab=people');
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
  if me is null then raise exception 'Not authenticated'; end if;

  select * into existing
  from public.friendships f
  where f.status = 'pending'
    and f.addressee_id = me
    and f.requester_id = other_id;

  if existing.id is null then raise exception 'No pending request'; end if;

  if accept then
    update public.friendships set status = 'accepted' where id = existing.id;
    select coalesce(nullif(display_name, ''), handle, 'Someone') into actor from public.profiles where id = me;
    perform private.notify_user(
      other_id,
      actor || ' accepted your friend request',
      '/u/' || (select handle from public.profiles where id = me)
    );
  else
    delete from public.friendships where id = existing.id;
  end if;
end;
$$;

create or replace function public.block_person(other_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing public.friendships;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if other_id is null or other_id = me then raise exception 'Invalid person'; end if;

  delete from public.follows
  where (follower_id = me and following_id = other_id)
     or (follower_id = other_id and following_id = me);

  select * into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, other_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, other_id);

  if existing.id is null then
    insert into public.friendships (requester_id, addressee_id, status)
    values (me, other_id, 'blocked');
  else
    update public.friendships
    set status = 'blocked', requester_id = me, addressee_id = other_id
    where id = existing.id;
  end if;
end;
$$;

create or replace function public.unblock_person(other_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  delete from public.friendships f
  where f.status = 'blocked'
    and f.requester_id = me
    and f.addressee_id = other_id;
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
  if me is null then raise exception 'Not authenticated'; end if;

  select * into inviter
  from public.profiles p
  where p.invite_code = lower(trim(code));

  if inviter.id is null then raise exception 'Invite not found'; end if;
  if inviter.id = me then return me; end if;
  if private.is_blocked(me, inviter.id) then raise exception 'Cannot use this invite'; end if;

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
  elsif existing.status = 'blocked' then
    raise exception 'Cannot use this invite';
  end if;

  select coalesce(nullif(display_name, ''), handle, 'Someone') into actor
  from public.profiles where id = me;
  perform private.notify_user(
    inviter.id,
    actor || ' joined via your invite',
    '/u/' || (select handle from public.profiles where id = me)
  );

  return inviter.id;
end;
$$;

create or replace function public.lookup_invite(code text)
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
begin
  if code is null or length(trim(code)) < 8 then
    return;
  end if;
  return query
    select p.id, p.handle, p.display_name, p.bio, p.avatar_path, p.visibility
    from public.profiles p
    where p.invite_code = lower(trim(code))
    limit 1;
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
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if length(needle) < 2 then return; end if;

  return query
    select p.id, p.handle, p.display_name, p.bio, p.avatar_path, p.visibility
    from public.profiles p
    where p.id <> auth.uid()
      and p.handle is not null
      and private.can_view_profile(p.id)
      and not private.is_blocked(auth.uid(), p.id)
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
        and private.are_friends(auth.uid(), r.author_id)
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
    and not private.is_blocked(auth.uid(), r.author_id)
  order by r.created_at desc
  limit 80;
$$;

-- Follow / recipient notify triggers use private.notify_user
create or replace function public.on_follow_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
begin
  select coalesce(nullif(display_name, ''), handle, 'Someone') into actor
  from public.profiles where id = new.follower_id;
  perform private.notify_user(
    new.following_id,
    actor || ' followed you',
    '/u/' || (select handle from public.profiles where id = new.follower_id)
  );
  return new;
end;
$$;

create or replace function public.on_recipient_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.recommendations;
  actor text;
begin
  select * into rec from public.recommendations where id = new.recommendation_id;
  select coalesce(nullif(display_name, ''), handle, 'Someone') into actor
  from public.profiles where id = rec.author_id;
  perform private.notify_user(
    new.user_id,
    actor || ' recommended ' || rec.item_name,
    '/friends'
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Protect standard lists + require why-notes
-- ---------------------------------------------------------------------------

create or replace function public.protect_standard_lists()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.kind = 'standard' then
      new.kind := 'standard';
      new.slug := old.slug;
      new.owner_id := old.owner_id;
    end if;
    if new.kind is distinct from old.kind then
      raise exception 'Cannot change list kind';
    end if;
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Cannot transfer list ownership';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lists_protect_standard on public.lists;
create trigger lists_protect_standard
  before update on public.lists
  for each row execute function public.protect_standard_lists();

revoke all on function public.protect_standard_lists() from public;
revoke all on function public.protect_standard_lists() from anon, authenticated;

-- Why-note required on recommendations (trim length 1–2000)
alter table public.recommendations
  drop constraint if exists recommendations_note_len;
alter table public.recommendations
  add constraint recommendations_note_len
  check (char_length(trim(note)) between 1 and 2000);

alter table public.recommendation_comments
  drop constraint if exists recommendation_comments_text_len;
alter table public.recommendation_comments
  add constraint recommendation_comments_text_len
  check (char_length(trim(text)) between 1 and 1000);

alter table public.profiles
  drop constraint if exists profiles_display_name_len;
alter table public.profiles
  add constraint profiles_display_name_len
  check (char_length(display_name) <= 80);

alter table public.profiles
  drop constraint if exists profiles_bio_len;
alter table public.profiles
  add constraint profiles_bio_len
  check (char_length(bio) <= 500);

-- ---------------------------------------------------------------------------
-- Force RLS + grants for new RPCs
-- ---------------------------------------------------------------------------

alter table public.profiles force row level security;
alter table public.tracked_items force row level security;
alter table public.diary_entries force row level security;
alter table public.notifications force row level security;
alter table public.recommendations force row level security;
alter table public.recommendation_reactions force row level security;
alter table public.recommendation_comments force row level security;
alter table public.follows force row level security;
alter table public.friendships force row level security;
alter table public.recommendation_recipients force row level security;
alter table public.lists force row level security;
alter table public.list_items force row level security;

revoke all on function public.block_person(uuid) from public;
revoke all on function public.unblock_person(uuid) from public;
grant execute on function public.block_person(uuid) to authenticated;
grant execute on function public.unblock_person(uuid) to authenticated;

-- Internal / immutable helpers should not be client RPCs
revoke all on function public.is_currently_on_status(text, text) from public;
revoke all on function public.is_currently_on_status(text, text) from anon, authenticated;
revoke all on function public.normalize_handle(text) from public;
revoke all on function public.normalize_handle(text) from anon, authenticated;

-- Feed index helpers
create index if not exists recommendations_visibility_author_idx
  on public.recommendations (visibility, author_id, created_at desc);
create index if not exists recommendation_recipients_user_idx
  on public.recommendation_recipients (user_id, recommendation_id);


-- NOTE: Remote also applied table least-privilege grants + profile_invites (see MCP migrations community_harden_table_grants_invites, community_harden_grants_invite).
