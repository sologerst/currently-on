-- Enable Realtime for the Friends feed tables.
-- Clients subscribe via supabase.channel(...).on('postgres_changes', ...).

alter publication supabase_realtime add table public.recommendations;
alter publication supabase_realtime add table public.recommendation_reactions;
alter publication supabase_realtime add table public.recommendation_comments;
