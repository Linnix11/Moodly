-- =====================================================================
--  MOODLY v2 : actions du manager, météo d'équipe, correctif d'anonymat
--  À exécuter APRÈS 20261013000000_init.sql (SQL Editor > Run)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. CORRECTIF D'ANONYMAT : on n'expose plus la journée EN COURS.
--    Problème : si le manager rafraîchit la moyenne du jour avant/après
--    UNE nouvelle réponse, il peut recalculer la note exacte de cette
--    personne : note = (n+1) × moyenne_après − n × moyenne_avant.
--    Solution : les stats ne portent que sur des journées TERMINÉES
--    (les 30 jours d'hier à J-30). Une journée close ne bouge plus.
-- ---------------------------------------------------------------------
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
    select generate_series(current_date - 30, current_date - 1, interval '1 day')::date as d
  ),
  agg as (
    select m.mood_date, avg(m.score) as moy, count(*)::int as nb
    from public.moods m
    where m.team_id = v_team_id
      and m.mood_date between current_date - 30 and current_date - 1
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

-- ---------------------------------------------------------------------
-- 1. ACTIONS DU MANAGER (« Vos retours ont été entendus »)
-- ---------------------------------------------------------------------
create table public.team_actions (
  id          bigint generated always as identity primary key,
  team_id     bigint not null references public.teams(id) on delete cascade,
  message     text not null check (char_length(message) between 5 and 280),
  tag         text,                                  -- tag concerné (facultatif)
  created_at  timestamptz not null default now()
);
create index team_actions_team_idx on public.team_actions (team_id, created_at desc);

alter table public.team_actions enable row level security;

-- Lecture : les membres de l'équipe et son manager
create policy "lire les actions de son equipe" on public.team_actions
  for select to authenticated using (
    team_id = (select team_id from public.profiles where id = auth.uid())
    or team_id in (select id from public.teams where manager_id = auth.uid())
  );
-- Aucune policy insert/update/delete : écriture uniquement via les fonctions ci-dessous.

create or replace function public.publish_action(p_message text, p_tag text default null)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_team_id bigint;
  v_id bigint;
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'manager' then
    raise exception 'Accès réservé aux managers';
  end if;
  select id into v_team_id from public.teams where manager_id = auth.uid() limit 1;
  if v_team_id is null then
    raise exception 'Aucune équipe gérée';
  end if;
  if char_length(coalesce(trim(p_message), '')) not between 5 and 280 then
    raise exception 'Message entre 5 et 280 caractères';
  end if;

  insert into public.team_actions (team_id, message, tag)
  values (v_team_id, trim(p_message), nullif(trim(p_tag), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_action(p_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.team_actions
  where id = p_id
    and team_id in (select id from public.teams where manager_id = auth.uid());
  if not found then
    raise exception 'Action introuvable';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. MÉTÉO D'ÉQUIPE POUR L'EMPLOYÉ
--    - hier : moyenne + top tags (journée close → pas de fuite), si >= 3 réponses
--    - aujourd'hui : SEULEMENT le nombre de réponses (participation), jamais la moyenne
-- ---------------------------------------------------------------------
create or replace function public.team_pulse()
returns table (
  hier_moyenne       numeric,   -- null si < 3 réponses hier
  hier_nb_reponses   int,
  hier_top_tags      text[],
  aujourdhui_nb_reponses int,
  nb_membres         int
)
language plpgsql security definer set search_path = public
as $$
declare
  v_team_id bigint;
  v_nb_hier int;
begin
  select team_id into v_team_id from public.profiles where id = auth.uid();
  if v_team_id is null then
    select id into v_team_id from public.teams where manager_id = auth.uid() limit 1;
  end if;
  if v_team_id is null then
    raise exception 'Utilisateur sans équipe';
  end if;

  select count(*)::int into v_nb_hier
  from public.moods where team_id = v_team_id and mood_date = current_date - 1;

  return query select
    case when v_nb_hier >= 3 then (
      select round(avg(score), 1) from public.moods
      where team_id = v_team_id and mood_date = current_date - 1
    ) end,
    v_nb_hier,
    case when v_nb_hier >= 3 then array(
      select t from public.moods m, unnest(m.tags) t
      where m.team_id = v_team_id and m.mood_date = current_date - 1
      group by t order by count(*) desc limit 3
    ) else '{}'::text[] end,
    (select count(*)::int from public.moods where team_id = v_team_id and mood_date = current_date),
    (select count(*)::int from public.profiles where team_id = v_team_id and role = 'employee');
end;
$$;

-- ---------------------------------------------------------------------
-- 3. DROITS
-- ---------------------------------------------------------------------
revoke execute on function public.publish_action(text, text) from public, anon;
revoke execute on function public.delete_action(bigint)      from public, anon;
revoke execute on function public.team_pulse()               from public, anon;
grant  execute on function public.publish_action(text, text) to authenticated;
grant  execute on function public.delete_action(bigint)      to authenticated;
grant  execute on function public.team_pulse()               to authenticated;

-- ---------------------------------------------------------------------
-- 4. DONNÉES DE DÉMO : 2 actions déjà publiées (si l'équipe de démo existe)
-- ---------------------------------------------------------------------
insert into public.team_actions (team_id, message, tag, created_at)
select id, 'Suite à vos retours sur la charge, la livraison du module Export est décalée d''une semaine.', 'Charge de travail', now() - interval '2 days'
from public.teams where name = 'Équipe Produit'
union all
select id, 'Merci pour le sprint ! Petit-déjeuner d''équipe vendredi à 9 h 🥐', 'Reconnaissance', now() - interval '6 days'
from public.teams where name = 'Équipe Produit';
