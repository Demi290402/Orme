-- ====================================================================
-- ORME MIGRATION: Notifiche In-App & Supabase Realtime (v2)
-- Esegui questo script nel SQL Editor del tuo progetto Supabase.
-- ====================================================================

-- 1. Assicura l'esistenza della tabella notifications
create table if not exists public.notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.users(id) on delete cascade,
    group_id    text not null,
    type        text not null,       -- 'richiesta_accesso', 'nuovo_capo', 'verbale_saved', 'location_added', 'proposal', 'calendario_evento', 'lista_attesa', 'generic'
    title       text not null,
    body        text not null default '',
    data        jsonb,
    is_read     boolean not null default false,
    created_at  timestamptz not null default now()
);

-- 2. Indici per performance ottimali
create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_group_id_idx on public.notifications (group_id, created_at desc);

-- 3. Abilita Row Level Security
alter table public.notifications enable row level security;

-- 4. Policy di lettura: l'utente legge solo le proprie notifiche
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

-- 5. Policy di aggiornamento: l'utente può segnare come lette le proprie notifiche
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
    on public.notifications for update
    using (auth.uid() = user_id);

-- 6. Policy di inserimento: consenti a utenti autenticati e anonimi (in fase di registrazione) di notificare i membri del gruppo
drop policy if exists "Allow insert notifications" on public.notifications;
create policy "Allow insert notifications"
    on public.notifications for insert
    with check (true);

-- 7. Abilitazione Realtime (fondamentale per aggiornare la campanella 🔔 in tempo reale senza dover ricaricare la pagina)
do $$
begin
    if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
        alter publication supabase_realtime add table public.notifications;
    end if;
end $$;
