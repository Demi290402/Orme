-- =====================================================
-- ORME: Notifications Table
-- Run this in Supabase SQL Editor
-- =====================================================

create table if not exists public.notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.users(id) on delete cascade,
    group_id    text not null,
    type        text not null,       -- 'verbale_saved' | 'location_added' | 'proposal' | 'generic'
    title       text not null,
    body        text not null default '',
    data        jsonb,               -- extra payload (verbale id, location id, etc.)
    is_read     boolean not null default false,
    created_at  timestamptz not null default now()
);

-- Index for fast per-user queries
create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_group_id_idx on public.notifications (group_id, created_at desc);

-- Enable Row Level Security
alter table public.notifications enable row level security;

-- Users can only read their own notifications
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
    on public.notifications for update
    using (auth.uid() = user_id);

-- Service role (used by Edge Functions and server-side) can insert for any user
-- Anon/authenticated can also insert (needed since we use anon key from client)
drop policy if exists "Allow insert notifications" on public.notifications;
create policy "Allow insert notifications"
    on public.notifications for insert
    with check (true);

-- Enable Realtime for the notifications table
alter publication supabase_realtime add table public.notifications;
