-- OPTIONAL ONLY. Run only in a dedicated A.I Văn phòng Supabase project
-- or after explicit authorization to use a namespaced schema.
create table if not exists public.ai_office_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  event_type text not null check (char_length(event_type) between 2 and 80),
  task_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_office_events enable row level security;

drop policy if exists "ai_office_events_select_own" on public.ai_office_events;
create policy "ai_office_events_select_own"
on public.ai_office_events for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "ai_office_events_insert_own" on public.ai_office_events;
create policy "ai_office_events_insert_own"
on public.ai_office_events for insert
to authenticated
with check (owner_id = auth.uid());

create index if not exists ai_office_events_owner_created_idx
on public.ai_office_events(owner_id, created_at desc);
