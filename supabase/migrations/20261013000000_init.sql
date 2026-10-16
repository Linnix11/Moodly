-- =====================================================================
--  WORKZEN — Schéma Supabase (à coller dans SQL Editor > New query > Run)
--  Principe : la table "moods" ne contient AUCUN lien vers l'utilisateur.
--  Personne (ni employé, ni manager) ne peut lire "moods" directement :
--  tout passe par 2 fonctions sécurisées (submit_mood / team_stats).
-- =====================================================================

-- 1. ÉQUIPES ------------------------------------------------------------
create table public.teams (
  id          bigint generated always as identity primary key,
  name        text not null,
  manager_id  uuid references auth.users(id) on delete set null
);

-- 2. PROFILS (1 ligne par utilisateur, créée automatiquement) -----------
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  role            text not null default 'employee' check (role in ('employee', 'manager')),
  team_id         bigint references public.teams(id) on delete set null,
  last_mood_date  date            -- sert UNIQUEMENT à bloquer 2 saisies le même jour
);

-- 3. MOODS (anonymes : pas de user_id !) --------------------------------
create table public.moods (
  id         bigint generated always as identity primary key,
  team_id    bigint not null references public.teams(id) on delete cascade,
  score      smallint not null check (score between 1 and 5),
  tags       text[] not null default '{}',
  mood_date  date not null default current_date
);
create index moods_team_date_idx on public.moods (team_id, mood_date);

-- 4. CRÉATION AUTO DU PROFIL à l'inscription ----------------------------
--    Le rôle est TOUJOURS 'employee' : on ne fait pas confiance au client.
--    Les managers sont promus à la main (Table Editor > profiles).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. ROW LEVEL SECURITY -------------------------------------------------
alter table public.teams    enable row level security;
alter table public.profiles enable row level security;
alter table public.moods    enable row level security;

-- Chacun lit uniquement SON profil (pour connaître son rôle après le login)
create policy "lire son profil" on public.profiles
  for select to authenticated using (id = auth.uid());

-- On voit l'équipe dont on est membre ou manager
create policy "lire son equipe" on public.teams
  for select to authenticated using (
    manager_id = auth.uid()
    or id = (select team_id from public.profiles where id = auth.uid())
  );

-- moods : AUCUNE policy => aucune lecture/écriture directe possible.

-- 6. FONCTION : SAISIR SON MOOD ------------------------------------------
create or replace function public.submit_mood(p_score int, p_tags text[] default '{}')
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Non authentifié';
  end if;
  if v_profile.team_id is null then
    raise exception 'Utilisateur sans équipe';
  end if;
  if v_profile.last_mood_date = current_date then
    raise exception 'Mood déjà saisi aujourd''hui';
  end if;
  if p_score not between 1 and 5 then
    raise exception 'Score invalide';
  end if;
  if coalesce(array_length(p_tags, 1), 0) > 3 then
    raise exception '3 tags maximum';
  end if;

  insert into public.moods (team_id, score, tags)
  values (v_profile.team_id, p_score, coalesce(p_tags, '{}'));

  update public.profiles set last_mood_date = current_date where id = auth.uid();
end;
$$;

-- 7. FONCTION : STATS MANAGER (30 derniers jours, agrégées) --------------
--    Seuil d'anonymat : moyenne masquée (NULL) si moins de 3 réponses.
create or replace function public.team_stats()
returns table (jour date, moyenne numeric, nb_reponses int, top_tags text[])
language plpgsql security definer set search_path = public
as $$
declare
  v_team_id bigint;
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'manager' then
    raise exception 'Accès réservé aux managers';
  end if;

  select id into v_team_id from public.teams where manager_id = auth.uid() limit 1;
  if v_team_id is null then
    raise exception 'Aucune équipe gérée';
  end if;

  return query
  with jours as (
    select generate_series(current_date - 29, current_date, interval '1 day')::date as d
  ),
  agg as (
    select m.mood_date, avg(m.score) as moy, count(*)::int as nb
    from public.moods m
    where m.team_id = v_team_id and m.mood_date >= current_date - 29
    group by m.mood_date
  )
  select
    j.d,
    case when coalesce(a.nb, 0) >= 3 then round(a.moy, 2) end,
    coalesce(a.nb, 0),
    case when coalesce(a.nb, 0) >= 3 then array(
      select t from public.moods m2, unnest(m2.tags) t
      where m2.team_id = v_team_id and m2.mood_date = j.d
      group by t order by count(*) desc limit 3
    ) else '{}'::text[] end
  from jours j
  left join agg a on a.mood_date = j.d
  order by j.d;
end;
$$;

-- 8. DROITS D'EXÉCUTION : seulement les utilisateurs connectés -----------
revoke execute on function public.submit_mood(int, text[]) from public, anon;
revoke execute on function public.team_stats()            from public, anon;
grant  execute on function public.submit_mood(int, text[]) to authenticated;
grant  execute on function public.team_stats()            to authenticated;
