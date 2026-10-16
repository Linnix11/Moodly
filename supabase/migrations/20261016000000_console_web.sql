-- =====================================================================
--  WORKZEN : console web (managers + RH)
--  À exécuter APRÈS 20261015000000_features_v2.sql (SQL Editor > Run)
--  Règles d'anonymat inchangées : journées closes uniquement (jusqu'à hier),
--  moyenne masquée sous 3 réponses par jour, aucun rapport nominatif pour la RH.
-- =====================================================================

-- 1. RÔLE RH -----------------------------------------------------------
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('employee', 'manager', 'rh'));

-- La RH lit toutes les équipes et toutes les actions (en plus des policies existantes)
create policy "rh lit toutes les equipes" on public.teams
  for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'rh');
create policy "rh lit toutes les actions" on public.team_actions
  for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'rh');

-- 2. PÉRIMÈTRE DE LA CONSOLE (fonction interne, non appelable par le client)
--    manager : son équipe uniquement ; RH : une équipe choisie, ou toutes (p_team_id NULL)
create or replace function public._console_teams(p_team_id bigint)
returns bigint[]
language plpgsql stable security definer set search_path = public
as $$
declare
  v_role text;
  v_team bigint;
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role = 'manager' then
    select id into v_team from public.teams where manager_id = auth.uid() limit 1;
    if v_team is null then
      raise exception 'Aucune équipe gérée';
    end if;
    if p_team_id is not null and p_team_id <> v_team then
      raise exception 'Accès limité à ton équipe';
    end if;
    return array[v_team];
  end if;

  if v_role = 'rh' then
    if p_team_id is null then
      return array(select id from public.teams);
    end if;
    if not exists (select 1 from public.teams where id = p_team_id) then
      raise exception 'Équipe introuvable';
    end if;
    return array[p_team_id];
  end if;

  raise exception 'Accès réservé aux managers et RH';
end;
$$;

-- 3. INFOS DU PÉRIMÈTRE (nom, manager, nombre de membres) ---------------
create or replace function public.console_scope(p_team_id bigint default null)
returns table (equipe_id bigint, nom text, manager text, nb_membres int)
language plpgsql security definer set search_path = public
as $$
declare
  v_teams bigint[] := public._console_teams(p_team_id);
begin
  -- RH sans équipe choisie : toute l'entreprise
  if p_team_id is null and (select role from public.profiles where id = auth.uid()) = 'rh' then
    return query select
      null::bigint, 'Toute l''entreprise'::text, null::text,
      (select count(*)::int from public.profiles p where p.team_id = any(v_teams) and p.role = 'employee');
    return;
  end if;

  return query
  select t.id, t.name, coalesce(p.full_name, u.email)::text,
    (select count(*)::int from public.profiles pr where pr.team_id = t.id and pr.role = 'employee')
  from public.teams t
  left join auth.users u on u.id = t.manager_id
  left join public.profiles p on p.id = t.manager_id
  where t.id = v_teams[1];
end;
$$;

-- 4. STATS SUR UNE PÉRIODE AU CHOIX (journées closes, seuil de 3) --------
create or replace function public.console_stats(p_days int, p_team_id bigint default null)
returns table (jour date, moyenne numeric, nb_reponses int, top_tags text[])
language plpgsql security definer set search_path = public
as $$
declare
  v_teams bigint[] := public._console_teams(p_team_id);
begin
  if p_days not between 7 and 365 then
    raise exception 'Période invalide';
  end if;

  return query
  with jours as (
    select generate_series(current_date - p_days, current_date - 1, interval '1 day')::date as d
  ),
  agg as (
    select m.mood_date, avg(m.score) as moy, count(*)::int as nb
    from public.moods m
    where m.team_id = any(v_teams)
      and m.mood_date between current_date - p_days and current_date - 1
    group by m.mood_date
  )
  select
    j.d,
    case when coalesce(a.nb, 0) >= 3 then round(a.moy, 2) end,
    coalesce(a.nb, 0),
    case when coalesce(a.nb, 0) >= 3 then array(
      select tg from public.moods m2, unnest(m2.tags) tg
      where m2.team_id = any(v_teams) and m2.mood_date = j.d
      group by tg order by count(*) desc limit 3
    ) else '{}'::text[] end
  from jours j
  left join agg a on a.mood_date = j.d
  order by j.d;
end;
$$;

-- 5. SUJETS CITÉS : période en cours vs période précédente ---------------
--    Seulement les journées d'au moins 3 réponses (comme le graphe).
create or replace function public.console_topics(p_days int, p_team_id bigint default null)
returns table (tag text, nb int, nb_precedent int, total_reponses int)
language plpgsql security definer set search_path = public
as $$
declare
  v_teams bigint[] := public._console_teams(p_team_id);
begin
  if p_days not between 7 and 365 then
    raise exception 'Période invalide';
  end if;

  return query
  with vis as (
    select m.mood_date as d from public.moods m
    where m.team_id = any(v_teams) and m.mood_date between current_date - 2 * p_days and current_date - 1
    group by m.mood_date having count(*) >= 3
  ),
  mentions as (
    select tg as t, m.mood_date >= current_date - p_days as courant
    from public.moods m, unnest(m.tags) tg
    where m.team_id = any(v_teams) and m.mood_date in (select vis.d from vis)
  )
  select
    x.t,
    (count(*) filter (where x.courant))::int,
    (count(*) filter (where not x.courant))::int,
    (select count(*)::int from public.moods m
     where m.team_id = any(v_teams) and m.mood_date >= current_date - p_days
       and m.mood_date in (select vis.d from vis))
  from mentions x
  group by x.t
  order by 2 desc, 3 desc, x.t;
end;
$$;

-- 6. TENDANCES ANONYMES DES QUESTIONNAIRES (journées closes, seuil de 3) --
create or replace function public.console_report_summary(p_days int, p_team_id bigint default null)
returns table (question int, answer text, nb int)
language plpgsql security definer set search_path = public
as $$
declare
  v_teams bigint[] := public._console_teams(p_team_id);
begin
  if p_days not between 7 and 365 then
    raise exception 'Période invalide';
  end if;

  if (select count(*) from public.reports r
      where r.team_id = any(v_teams) and r.user_id is null
        and r.report_date between current_date - p_days and current_date - 1) < 3 then
    return;
  end if;

  return query
  select q.ord::int, q.a, count(*)::int
  from public.reports r, unnest(r.answers) with ordinality as q(a, ord)
  where r.team_id = any(v_teams) and r.user_id is null
    and r.report_date between current_date - p_days and current_date - 1
  group by q.ord, q.a
  order by q.ord, count(*) desc;
end;
$$;

-- 7. VUE ENTREPRISE (RH) : une ligne par équipe, 7 derniers jours clos ----
create or replace function public.company_overview()
returns table (
  equipe_id bigint, nom text, manager text, nb_membres int,
  nb_reponses_7j int, moyenne_7j numeric, moyenne_prec numeric, sujet text
)
language plpgsql security definer set search_path = public
as $$
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'rh' then
    raise exception 'Accès réservé aux RH';
  end if;

  return query
  with jours as (
    select m.team_id as tid, m.mood_date as d, count(*)::int as n, avg(m.score) as moy
    from public.moods m
    where m.mood_date between current_date - 14 and current_date - 1
    group by m.team_id, m.mood_date
  )
  select
    t.id,
    t.name,
    coalesce(p.full_name, u.email)::text,
    (select count(*)::int from public.profiles pr where pr.team_id = t.id and pr.role = 'employee'),
    coalesce((select sum(j.n)::int from jours j where j.tid = t.id and j.d >= current_date - 7), 0),
    (select round(sum(j.moy * j.n) / sum(j.n), 2) from jours j where j.tid = t.id and j.d >= current_date - 7 and j.n >= 3),
    (select round(sum(j.moy * j.n) / sum(j.n), 2) from jours j where j.tid = t.id and j.d < current_date - 7 and j.n >= 3),
    (select tg.val from public.moods m, unnest(m.tags) tg(val)
       where m.team_id = t.id
         and m.mood_date in (select j.d from jours j where j.tid = t.id and j.d >= current_date - 7 and j.n >= 3)
       group by tg.val order by count(*) desc, tg.val limit 1)
  from public.teams t
  left join auth.users u on u.id = t.manager_id
  left join public.profiles p on p.id = t.manager_id
  order by t.name;
end;
$$;

-- 8. MODIFIER UNE ACTION (manager de l'équipe) ---------------------------
create or replace function public.update_action(p_id bigint, p_message text, p_tag text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if char_length(coalesce(trim(p_message), '')) not between 5 and 280 then
    raise exception 'Message entre 5 et 280 caractères';
  end if;
  update public.team_actions
  set message = trim(p_message), tag = nullif(trim(p_tag), '')
  where id = p_id
    and team_id in (select id from public.teams where manager_id = auth.uid());
  if not found then
    raise exception 'Action introuvable';
  end if;
end;
$$;

-- 9. GESTION DES COMPTES ET DES ÉQUIPES (RH) -----------------------------
create or replace function public._require_rh()
returns void
language plpgsql stable security definer set search_path = public
as $$
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'rh' then
    raise exception 'Accès réservé aux RH';
  end if;
end;
$$;

-- Tous les comptes, y compris ceux sans profil (role NULL)
create or replace function public.rh_list_users()
returns table (user_id uuid, email text, full_name text, role text, equipe_id bigint, equipe text)
language plpgsql security definer set search_path = public
as $$
begin
  perform public._require_rh();
  return query
  select u.id, u.email::text, p.full_name, p.role, p.team_id, t.name
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.teams t on t.id = p.team_id
  order by u.email;
end;
$$;

-- Change le rôle et l'équipe d'un compte (crée son profil s'il manque)
create or replace function public.rh_set_user(p_user uuid, p_role text, p_team_id bigint default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public._require_rh();
  if p_role is null or p_role not in ('employee', 'manager', 'rh') then
    raise exception 'Rôle invalide';
  end if;
  if p_user = auth.uid() and p_role <> 'rh' then
    raise exception 'Tu ne peux pas retirer ton propre rôle RH';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'Utilisateur introuvable';
  end if;
  if p_team_id is not null and not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'Équipe introuvable';
  end if;

  insert into public.profiles (id) values (p_user) on conflict (id) do nothing;
  update public.profiles set role = p_role, team_id = p_team_id where id = p_user;

  -- Un compte qui n'est plus manager ne gère plus d'équipe
  if p_role <> 'manager' then
    update public.teams set manager_id = null where manager_id = p_user;
  end if;
end;
$$;

-- Crée (p_id NULL) ou modifie une équipe. Renvoie son id.
create or replace function public.rh_save_team(p_id bigint, p_name text, p_manager uuid default null)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
begin
  perform public._require_rh();
  if char_length(coalesce(trim(p_name), '')) not between 2 and 60 then
    raise exception 'Nom d''équipe entre 2 et 60 caractères';
  end if;
  if p_manager is not null then
    if (select role from public.profiles where id = p_manager) is distinct from 'manager' then
      raise exception 'Ce compte n''a pas le rôle manager';
    end if;
    if exists (select 1 from public.teams where manager_id = p_manager and id is distinct from p_id) then
      raise exception 'Ce manager gère déjà une équipe';
    end if;
  end if;

  if p_id is null then
    insert into public.teams (name, manager_id) values (trim(p_name), p_manager) returning id into v_id;
  else
    update public.teams set name = trim(p_name), manager_id = p_manager where id = p_id returning id into v_id;
    if v_id is null then
      raise exception 'Équipe introuvable';
    end if;
  end if;

  -- Le manager fait partie de l'équipe qu'il gère
  if p_manager is not null then
    update public.profiles set team_id = v_id where id = p_manager;
  end if;
  return v_id;
end;
$$;

-- Supprime une équipe vide (ATTENTION : ses humeurs, rapports et actions sont supprimés)
create or replace function public.rh_delete_team(p_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public._require_rh();
  if exists (select 1 from public.profiles where team_id = p_id and role = 'employee') then
    raise exception 'Retire d''abord les membres de cette équipe';
  end if;
  update public.profiles set team_id = null where team_id = p_id;
  delete from public.teams where id = p_id;
  if not found then
    raise exception 'Équipe introuvable';
  end if;
end;
$$;

-- 10. DROITS D'EXÉCUTION -------------------------------------------------
revoke execute on function public._console_teams(bigint) from public, anon, authenticated;
revoke execute on function public._require_rh()           from public, anon, authenticated;

revoke execute on function public.console_scope(bigint)                from public, anon;
revoke execute on function public.console_stats(int, bigint)           from public, anon;
revoke execute on function public.console_topics(int, bigint)          from public, anon;
revoke execute on function public.console_report_summary(int, bigint)  from public, anon;
revoke execute on function public.company_overview()                   from public, anon;
revoke execute on function public.update_action(bigint, text, text)    from public, anon;
revoke execute on function public.rh_list_users()                      from public, anon;
revoke execute on function public.rh_set_user(uuid, text, bigint)      from public, anon;
revoke execute on function public.rh_save_team(bigint, text, uuid)     from public, anon;
revoke execute on function public.rh_delete_team(bigint)               from public, anon;

grant execute on function public.console_scope(bigint)                to authenticated;
grant execute on function public.console_stats(int, bigint)           to authenticated;
grant execute on function public.console_topics(int, bigint)          to authenticated;
grant execute on function public.console_report_summary(int, bigint)  to authenticated;
grant execute on function public.company_overview()                   to authenticated;
grant execute on function public.update_action(bigint, text, text)    to authenticated;
grant execute on function public.rh_list_users()                      to authenticated;
grant execute on function public.rh_set_user(uuid, text, bigint)      to authenticated;
grant execute on function public.rh_save_team(bigint, text, uuid)     to authenticated;
grant execute on function public.rh_delete_team(bigint)               to authenticated;
