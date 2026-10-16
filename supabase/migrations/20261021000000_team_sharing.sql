-- =====================================================================
--  WORKZEN : « Mon équipe » — partage volontaire avec son manager
--  À exécuter APRÈS 20261020000000_shared_reports.sql (SQL Editor > Run)
--
--  Un salarié peut activer « Mon manager peut voir mes réponses » (désactivé par défaut).
--  Tant que c'est activé :
--    - son humeur du jour (note + sujets) est copiée avec son nom dans shared_moods ;
--    - ses questionnaires sont transmis avec son nom à son manager (sauf s'il choisit « aux RH »).
--  En le désactivant, tout ce qui a été partagé par ce biais est SUPPRIMÉ.
--
--  Protection des collègues : une humeur partagée compte toujours dans les moyennes de l'équipe
--  (table moods, colonne partage = true, toujours sans nom), mais le seuil de 3 ne compte plus
--  que les réponses ANONYMES. Sinon, en retranchant les notes qu'il connaît, le manager pourrait
--  calculer la note d'un collègue (ex. : 3 réponses dont 2 partagées).
-- =====================================================================

-- 1. ACCORD DU SALARIÉ ---------------------------------------------------
alter table public.profiles
  add column if not exists share_with_manager boolean not null default false,
  add column if not exists share_since timestamptz;

-- 2. HUMEURS : marqueur « partagée » (sans nom) + copie nominative ---------
alter table public.moods add column if not exists partage boolean not null default false;

create table if not exists public.shared_moods (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  team_id    bigint references public.teams(id) on delete set null,
  mood_date  date not null default current_date,
  score      smallint not null check (score between 1 and 5),
  tags       text[] not null default '{}'
);
create index if not exists shared_moods_user_idx on public.shared_moods (user_id, mood_date desc);
alter table public.shared_moods enable row level security; -- aucune policy : accès via fonctions

-- Questionnaires transmis grâce à l'accord (et non par la question 4) : supprimés au retrait
alter table public.shared_reports add column if not exists via_accord boolean not null default false;

-- 3. SAISIE DE L'HUMEUR ------------------------------------------------------
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

  insert into public.moods (team_id, score, tags, partage)
  values (v_profile.team_id, p_score, coalesce(p_tags, '{}'), v_profile.share_with_manager);

  if v_profile.share_with_manager then
    insert into public.shared_moods (user_id, team_id, score, tags)
    values (auth.uid(), v_profile.team_id, p_score, coalesce(p_tags, '{}'));
  end if;

  update public.profiles set last_mood_date = current_date where id = auth.uid();
end;
$$;

-- 4. ENVOI DU QUESTIONNAIRE : question 4, puis accord ---------------------------
create or replace function public.submit_report(p_answers text[], p_comment text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_comment text := nullif(btrim(p_comment), '');
  v_dest text;
  v_via_accord boolean := false;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'Non authentifié';
  end if;
  if v_profile.team_id is null then
    raise exception 'Utilisateur sans équipe';
  end if;
  if v_profile.last_report_date = current_date then
    raise exception 'Rapport déjà envoyé aujourd''hui';
  end if;
  if coalesce(array_length(p_answers, 1), 0) <> 5
     or exists (select 1 from unnest(p_answers) a where a is null or a !~ '^[a-z_]{1,30}$') then
    raise exception 'Réponses invalides';
  end if;
  if v_comment is not null and char_length(v_comment) > 500 then
    raise exception 'Commentaire trop long';
  end if;

  v_dest := case p_answers[4] when 'manager' then 'manager' when 'rh' then 'rh' end;
  if v_dest is null and v_profile.share_with_manager then
    v_dest := 'manager';
    v_via_accord := true;
  end if;
  if v_dest = 'manager' and not exists (select 1 from public.teams where id = v_profile.team_id and manager_id is not null) then
    if v_via_accord then
      v_dest := null; -- pas de manager : le questionnaire reste anonyme
    else
      raise exception 'Pas de manager pour cette équipe';
    end if;
  end if;

  if v_dest is null then
    insert into public.reports (team_id, answers, commentaire) values (v_profile.team_id, p_answers, v_comment);
  else
    insert into public.shared_reports (user_id, team_id, destinataire, answers, commentaire, via_accord)
    values (auth.uid(), v_profile.team_id, v_dest, p_answers, v_comment, v_via_accord);
  end if;
  update public.profiles set last_report_date = current_date where id = auth.uid();
end;
$$;

-- 5. ACTIVER / RETIRER L'ACCORD (le salarié lui-même) ------------------------------
create or replace function public.my_sharing()
returns table (actif boolean, depuis timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.share_with_manager, p.share_since from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.set_share_with_manager(p_enabled boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;
  if p_enabled then
    update public.profiles
    set share_with_manager = true, share_since = coalesce(share_since, now())
    where id = auth.uid() and not share_with_manager;
  else
    -- Retrait : tout ce qui a été partagé grâce à l'accord est supprimé
    delete from public.shared_moods where user_id = auth.uid();
    delete from public.shared_reports where user_id = auth.uid() and via_accord;
    update public.profiles set share_with_manager = false, share_since = null where id = auth.uid();
  end if;
end;
$$;

-- 6. VISIBILITÉ DES QUESTIONNAIRES PARTAGÉS (remplace la version précédente) ---------
--    Un questionnaire « via l'accord » n'est visible que si l'accord est toujours actif.
create or replace function public._shared_reports_visible()
returns setof public.shared_reports
language plpgsql stable security definer set search_path = public
as $$
declare
  v_role text := (select role from public.profiles where id = auth.uid());
begin
  if v_role = 'manager' then
    return query select s.* from public.shared_reports s
    join public.profiles p on p.id = s.user_id
    where s.destinataire = 'manager'
      and s.team_id in (select t.id from public.teams t where t.manager_id = auth.uid())
      and (not s.via_accord or p.share_with_manager);
  elsif v_role = 'rh' then
    return query select s.* from public.shared_reports s where s.destinataire = 'rh';
  else
    raise exception 'Accès réservé aux managers et RH';
  end if;
end;
$$;

-- 7. PAGE « MON ÉQUIPE » (manager) --------------------------------------------------
create or replace function public._managed_team()
returns bigint
language plpgsql stable security definer set search_path = public
as $$
declare
  v_team bigint;
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'manager' then
    raise exception 'Accès réservé aux managers';
  end if;
  select id into v_team from public.teams where manager_id = auth.uid() limit 1;
  if v_team is null then
    raise exception 'Aucune équipe gérée';
  end if;
  return v_team;
end;
$$;

-- Membres de l'équipe : le nom est connu du manager ; les réponses, seulement si partagées
create or replace function public.team_members()
returns table (user_id uuid, nom text, partage boolean, nb_humeurs int, derniere_humeur date, nb_questionnaires int, a_traiter int)
language plpgsql security definer set search_path = public
as $$
declare
  v_team bigint := public._managed_team();
begin
  return query
  select p.id, coalesce(p.full_name, u.email)::text, p.share_with_manager,
    case when p.share_with_manager then (select count(*)::int from public.shared_moods sm where sm.user_id = p.id) else 0 end,
    case when p.share_with_manager then (select max(sm.mood_date) from public.shared_moods sm where sm.user_id = p.id) end,
    (select count(*)::int from public._shared_reports_visible() s where s.user_id = p.id),
    (select count(*)::int from public._shared_reports_visible() s where s.user_id = p.id and not s.traitee)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.team_id = v_team and p.role = 'employee'
  order by p.share_with_manager desc, coalesce(p.full_name, u.email);
end;
$$;

-- Humeurs partagées d'un membre (90 derniers jours), seulement si son accord est actif
create or replace function public.team_member_moods(p_user uuid)
returns table (mood_date date, score smallint, tags text[])
language plpgsql security definer set search_path = public
as $$
declare
  v_team bigint := public._managed_team();
begin
  if not exists (select 1 from public.profiles p where p.id = p_user and p.team_id = v_team and p.share_with_manager) then
    return;
  end if;
  return query
  select sm.mood_date, sm.score, sm.tags from public.shared_moods sm
  where sm.user_id = p_user and sm.mood_date >= current_date - 90
  order by sm.mood_date desc;
end;
$$;

-- 8. STATISTIQUES : seuil de 3 calculé sur les réponses anonymes uniquement ----------
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
  perform public._require_team_size(array[v_team_id]);

  return query
  with jours as (
    select generate_series(current_date - 30, current_date - 1, interval '1 day')::date as d
  ),
  agg as (
    select m.mood_date, avg(m.score) as moy, count(*)::int as nb,
      (count(*) filter (where not m.partage))::int as nb_anon
    from public.moods m
    where m.team_id = v_team_id
      and m.mood_date between current_date - 30 and current_date - 1
    group by m.mood_date
  )
  select
    j.d,
    case when coalesce(a.nb_anon, 0) >= 3 then round(a.moy, 2) end,
    coalesce(a.nb, 0),
    case when coalesce(a.nb_anon, 0) >= 3 then array(
      select t from public.moods m2, unnest(m2.tags) t
      where m2.team_id = v_team_id and m2.mood_date = j.d
      group by t order by count(*) desc limit 3
    ) else '{}'::text[] end
  from jours j
  left join agg a on a.mood_date = j.d
  order by j.d;
end;
$$;

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
  perform public._require_team_size(v_teams);

  return query
  with jours as (
    select generate_series(current_date - p_days, current_date - 1, interval '1 day')::date as d
  ),
  agg as (
    select m.mood_date, avg(m.score) as moy, count(*)::int as nb,
      (count(*) filter (where not m.partage))::int as nb_anon
    from public.moods m
    where m.team_id = any(v_teams)
      and m.mood_date between current_date - p_days and current_date - 1
    group by m.mood_date
  )
  select
    j.d,
    case when coalesce(a.nb_anon, 0) >= 3 then round(a.moy, 2) end,
    coalesce(a.nb, 0),
    case when coalesce(a.nb_anon, 0) >= 3 then array(
      select tg from public.moods m2, unnest(m2.tags) tg
      where m2.team_id = any(v_teams) and m2.mood_date = j.d
      group by tg order by count(*) desc limit 3
    ) else '{}'::text[] end
  from jours j
  left join agg a on a.mood_date = j.d
  order by j.d;
end;
$$;

create or replace function public.team_pulse()
returns table (
  hier_moyenne       numeric,
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
  v_anon_hier int;
begin
  select team_id into v_team_id from public.profiles where id = auth.uid();
  if v_team_id is null then
    select id into v_team_id from public.teams where manager_id = auth.uid() limit 1;
  end if;
  if v_team_id is null then
    raise exception 'Utilisateur sans équipe';
  end if;
  perform public._require_team_size(array[v_team_id]);

  select count(*)::int into v_nb_hier
  from public.moods where team_id = v_team_id and mood_date = current_date - 1;
  select count(*)::int into v_anon_hier
  from public.moods where team_id = v_team_id and mood_date = current_date - 1 and not partage;

  return query select
    case when v_anon_hier >= 3 then (
      select round(avg(score), 1) from public.moods
      where team_id = v_team_id and mood_date = current_date - 1
    ) end,
    v_nb_hier,
    case when v_anon_hier >= 3 then array(
      select t from public.moods m, unnest(m.tags) t
      where m.team_id = v_team_id and m.mood_date = current_date - 1
      group by t order by count(*) desc limit 3
    ) else '{}'::text[] end,
    (select count(*)::int from public.moods where team_id = v_team_id and mood_date = current_date),
    (select count(*)::int from public.profiles where team_id = v_team_id and role = 'employee');
end;
$$;

create or replace function public.console_topics(p_days int, p_team_id bigint default null)
returns table (tag text, nb int, nb_precedent int, total_reponses int, total_precedent int)
language plpgsql security definer set search_path = public
as $$
declare
  v_teams bigint[] := public._console_teams(p_team_id);
begin
  if p_days not between 7 and 365 then
    raise exception 'Période invalide';
  end if;
  perform public._require_team_size(v_teams);

  return query
  with vis as (
    select m.mood_date as d from public.moods m
    where m.team_id = any(v_teams) and m.mood_date between current_date - 2 * p_days and current_date - 1
    group by m.mood_date having count(*) filter (where not m.partage) >= 3
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
       and m.mood_date in (select vis.d from vis)),
    (select count(*)::int from public.moods m
     where m.team_id = any(v_teams) and m.mood_date < current_date - p_days
       and m.mood_date in (select vis.d from vis))
  from mentions x
  group by x.t
  order by 2 desc, 3 desc, x.t;
end;
$$;

create or replace function public.company_overview()
returns table (
  equipe_id bigint, nom text, manager text, nb_membres int,
  nb_reponses_7j int, moyenne_7j numeric, moyenne_prec numeric, sujet text, masquee boolean
)
language plpgsql security definer set search_path = public
as $$
begin
  if (select role from public.profiles where id = auth.uid()) is distinct from 'rh' then
    raise exception 'Accès réservé aux RH';
  end if;

  return query
  with jours as (
    select m.team_id as tid, m.mood_date as d, count(*)::int as n, avg(m.score) as moy,
      (count(*) filter (where not m.partage))::int as na
    from public.moods m
    where m.mood_date between current_date - 14 and current_date - 1
    group by m.team_id, m.mood_date
  ),
  equipes as (
    select t.id, t.name, t.manager_id,
      (select count(*)::int from public.profiles pr where pr.team_id = t.id and pr.role = 'employee') as membres
    from public.teams t
  )
  select
    e.id,
    e.name,
    coalesce(p.full_name, u.email)::text,
    e.membres,
    case when e.membres >= 3 then coalesce((select sum(j.n)::int from jours j where j.tid = e.id and j.d >= current_date - 7), 0) end,
    case when e.membres >= 3 then (select round(sum(j.moy * j.n) / sum(j.n), 2) from jours j where j.tid = e.id and j.d >= current_date - 7 and j.na >= 3) end,
    case when e.membres >= 3 then (select round(sum(j.moy * j.n) / sum(j.n), 2) from jours j where j.tid = e.id and j.d < current_date - 7 and j.na >= 3) end,
    case when e.membres >= 3 then (
      select tg.val from public.moods m, unnest(m.tags) tg(val)
      where m.team_id = e.id
        and m.mood_date in (select j.d from jours j where j.tid = e.id and j.d >= current_date - 7 and j.na >= 3)
      group by tg.val order by count(*) desc, tg.val limit 1
    ) end,
    e.membres < 3
  from equipes e
  left join auth.users u on u.id = e.manager_id
  left join public.profiles p on p.id = e.manager_id
  order by e.name;
end;
$$;

create or replace function public.action_impact(p_team_id bigint default null)
returns table (action_id bigint, publie_le date, moyenne_avant numeric, moyenne_apres numeric, delta numeric)
language plpgsql security definer set search_path = public
as $$
declare
  v_teams bigint[] := public._console_teams(p_team_id);
begin
  perform public._require_team_size(v_teams);

  return query
  with jours as (
    select m.team_id as tid, m.mood_date as d, avg(m.score) as moy
    from public.moods m
    where m.team_id = any(v_teams) and m.mood_date < current_date
    group by m.team_id, m.mood_date having count(*) filter (where not m.partage) >= 3
  ),
  calc as (
    select a.id as aid, a.created_at::date as pub,
      (select avg(j.moy) from jours j where j.tid = a.team_id and j.d between a.created_at::date - 7 and a.created_at::date - 1) as av,
      (select count(*) from jours j where j.tid = a.team_id and j.d between a.created_at::date - 7 and a.created_at::date - 1) as n_av,
      (select avg(j.moy) from jours j where j.tid = a.team_id and j.d between a.created_at::date + 1 and a.created_at::date + 7) as ap,
      (select count(*) from jours j where j.tid = a.team_id and j.d between a.created_at::date + 1 and a.created_at::date + 7) as n_ap
    from public.team_actions a
    where a.team_id = any(v_teams)
  )
  select c.aid, c.pub,
         case when c.n_av >= 3 then round(c.av, 1) end,
         case when c.n_ap >= 3 then round(c.ap, 1) end,
         case when c.n_av >= 3 and c.n_ap >= 3 then round(c.ap - c.av, 1) end
  from calc c
  order by c.pub desc;
end;
$$;

create or replace function public.company_benchmark(p_days int default 30, p_team_id bigint default null)
returns table (moyenne_equipe numeric, moyenne_entreprise numeric, nb_equipes int)
language plpgsql security definer set search_path = public
as $$
declare
  v_teams bigint[] := public._console_teams(p_team_id);
  v_team bigint := case when array_length(v_teams, 1) = 1 then v_teams[1] end;
begin
  if p_days not between 7 and 365 then
    raise exception 'Période invalide';
  end if;

  return query
  with jours as (
    select m.team_id as tid, m.mood_date as d, avg(m.score) as moy
    from public.moods m
    where m.mood_date between current_date - p_days and current_date - 1
      and (select count(*) from public.profiles pr where pr.team_id = m.team_id and pr.role = 'employee') >= 3
    group by m.team_id, m.mood_date having count(*) filter (where not m.partage) >= 3
  ),
  par_equipe as (select j.tid, avg(j.moy) as moy from jours j group by j.tid)
  select
    (select round(pe.moy, 1) from par_equipe pe where pe.tid = v_team),
    case when (select count(*) from par_equipe) >= 2 then (select round(avg(pe.moy), 1) from par_equipe pe) end,
    (select count(*)::int from par_equipe);
end;
$$;

-- 9. DROITS ------------------------------------------------------------------------
revoke execute on function public._managed_team() from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.submit_mood(int, text[])', 'public.submit_report(text[], text)', 'public.my_sharing()',
    'public.set_share_with_manager(boolean)', 'public.team_members()', 'public.team_member_moods(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
