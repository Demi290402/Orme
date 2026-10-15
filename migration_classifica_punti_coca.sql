-- ====================================================================
-- ORME MIGRATION: Classifica Punti & Storico Punti per Comunità Capi
-- Esegui questo script nel SQL Editor del tuo progetto Supabase.
-- ====================================================================

-- 1. Aggiungi la colonna group_points per tracciare i punti accumulati in ciascuna Comunità Capi
alter table public.users add column if not exists group_points jsonb default '{}'::jsonb;

-- 2. Inizializza group_points per gli utenti esistenti con i punti attuali nel loro gruppo di appartenenza
update public.users
set group_points = jsonb_build_object(
    coalesce(nullif(group_id, ''), nullif(group_name, ''), 'default'),
    coalesce(points, 0)
)
where (group_points is null or group_points = '{}'::jsonb) and (group_id is not null or group_name is not null);

-- 3. Indici per velocizzare le query sulla classifica (capi attivi ordinati per punti decrescenti)
create index if not exists users_active_leaderboard_idx on public.users (group_id, points desc) where membership_status = 'attivo';
create index if not exists users_active_leaderboard_name_idx on public.users (group_name, points desc) where membership_status = 'attivo';
