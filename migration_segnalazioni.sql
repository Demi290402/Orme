-- ====================================================================
-- ORME MIGRATION: Segnalazione Problemi e Feedback (v1)
-- Esegui questo script nel SQL Editor del tuo progetto Supabase.
-- ====================================================================

-- 1. Tabella per archiviare le segnalazioni inviate dagli utenti
create table if not exists public.segnalazioni_problemi (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references public.users(id) on delete set null,
    reporter_name   text not null,
    reporter_email  text not null,
    reporter_group  text,
    category        text not null,      -- 'Errore / Malfunzionamento', 'Difficoltà Visiva / Schermo', 'Suggerimento o Idea', 'Altra Segnalazione'
    title           text not null,
    description     text not null,
    device_info     jsonb,
    status          text not null default 'aperta', -- 'aperta', 'in_corso', 'risolta'
    note_interne    text,
    created_at      timestamptz not null default now()
);

-- 2. Indici per ricerca rapida
create index if not exists segnalazioni_created_at_idx on public.segnalazioni_problemi (created_at desc);
create index if not exists segnalazioni_user_id_idx on public.segnalazioni_problemi (user_id);
create index if not exists segnalazioni_status_idx on public.segnalazioni_problemi (status);

-- 3. Abilita Row Level Security
alter table public.segnalazioni_problemi enable row level security;

-- 4. Policy di inserimento: consenti a chiunque (anche in caso di sessione anonima o problemi di login) di inviare una segnalazione
drop policy if exists "Allow insert segnalazioni_problemi" on public.segnalazioni_problemi;
create policy "Allow insert segnalazioni_problemi"
    on public.segnalazioni_problemi for insert
    with check (true);

-- 5. Policy di lettura: l'utente loggato legge solo le proprie segnalazioni
drop policy if exists "Users can read own segnalazioni" on public.segnalazioni_problemi;
create policy "Users can read own segnalazioni"
    on public.segnalazioni_problemi for select
    using (auth.uid() = user_id);
