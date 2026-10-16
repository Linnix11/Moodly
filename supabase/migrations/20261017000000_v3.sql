-- =====================================================================
--  WORKZEN v3 : corrections d'anonymat, garde-fous, suivi des actions
--  À exécuter APRÈS 20261016000000_console_web.sql (SQL Editor > Run)
--  Règles : aucune valeur d'humeur, de réaction ou de questionnaire liée à
--  un utilisateur ; seuil de 3 ; journées closes uniquement.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A2. GARDE-FOU : équipe de moins de 3 employés => statistiques masquées
-- ---------------------------------------------------------------------
create or replace function public._require_team_size(p_teams bigint[])
returns void
language plpgsql stable security definer set search_path = public
as $$
begin
  if (select count(*) from public.profiles where team_id = any(p_teams) and role = 'employee') < 3 then
    raise exception 'Équipe de moins de 3 personnes';
  end if;
end;
$$;

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

-- A4. Sujets : on renvoie aussi le total de la période précédente
--     (0 = pas d'historique exploitable => le front affiche « — »)
drop function public.console_topics(int, bigint);
create function public.console_topics(p_days int, p_team_id bigint default null)
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
       and m.mood_date in (select vis.d from vis)),
    (select count(*)::int from public.moods m
     where m.team_id = any(v_teams) and m.mood_date < current_date - p_days
       and m.mood_date in (select vis.d from vis))
  from mentions x
  group by x.t
  order by 2 desc, 3 desc, x.t;
end;
$$;

-- Vue entreprise : une équipe de moins de 3 employés est masquée (colonne masquee)
drop function public.company_overview();
create function public.company_overview()
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
    select m.team_id as tid, m.mood_date as d, count(*)::int as n, avg(m.score) as moy
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
    case when e.membres >= 3 then (select round(sum(j.moy * j.n) / sum(j.n), 2) from jours j where j.tid = e.id and j.d >= current_date - 7 and j.n >= 3) end,
    case when e.membres >= 3 then (select round(sum(j.moy * j.n) / sum(j.n), 2) from jours j where j.tid = e.id and j.d < current_date - 7 and j.n >= 3) end,
    case when e.membres >= 3 then (
      select tg.val from public.moods m, unnest(m.tags) tg(val)
      where m.team_id = e.id
        and m.mood_date in (select j.d from jours j where j.tid = e.id and j.d >= current_date - 7 and j.n >= 3)
      group by tg.val order by count(*) desc, tg.val limit 1
    ) end,
    e.membres < 3
  from equipes e
  left join auth.users u on u.id = e.manager_id
  left join public.profiles p on p.id = e.manager_id
  order by e.name;
end;
$$;

-- ---------------------------------------------------------------------
-- A1. FIN DES RAPPORTS NOMINATIFS
--     Le questionnaire devient 100 % anonyme : plus d'utilisateur ni de note.
--     Les rapports nominatifs existants sont supprimés (note + date + identité).
-- ---------------------------------------------------------------------
drop function if exists public.team_reports();
drop function if exists public.submit_report(text[], boolean, int);

delete from public.reports where user_id is not null;
alter table public.reports drop constraint if exists reports_check;
alter table public.reports drop column user_id, drop column score;

create function public.submit_report(p_answers text[])
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
  if v_profile.last_report_date = current_date then
    raise exception 'Rapport déjà envoyé aujourd''hui';
  end if;
  if coalesce(array_length(p_answers, 1), 0) <> 5
     or exists (select 1 from unnest(p_answers) a where a is null or a !~ '^[a-z_]{1,30}$') then
    raise exception 'Réponses invalides';
  end if;

  insert into public.reports (team_id, answers) values (v_profile.team_id, p_answers);
  update public.profiles set last_report_date = current_date where id = auth.uid();
end;
$$;

-- Tendances anonymes (mobile) : journées closes uniquement, seuil de 3
create or replace function public.team_report_summary()
returns table (question int, answer text, nb int)
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

  if (select count(*) from public.reports r
      where r.team_id = v_team_id and r.report_date between current_date - 30 and current_date - 1) < 3 then
    return;
  end if;

  return query
  select q.ord::int, q.a, count(*)::int
  from public.reports r, unnest(r.answers) with ordinality as q(a, ord)
  where r.team_id = v_team_id and r.report_date between current_date - 30 and current_date - 1
  group by q.ord, q.a
  order by q.ord, count(*) desc;
end;
$$;

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
  perform public._require_team_size(v_teams);

  if (select count(*) from public.reports r
      where r.team_id = any(v_teams) and r.report_date between current_date - p_days and current_date - 1) < 3 then
    return;
  end if;

  return query
  select q.ord::int, q.a, count(*)::int
  from public.reports r, unnest(r.answers) with ordinality as q(a, ord)
  where r.team_id = any(v_teams) and r.report_date between current_date - p_days and current_date - 1
  group by q.ord, q.a
  order by q.ord, count(*) desc;
end;
$$;

-- ---------------------------------------------------------------------
-- A1. DEMANDES DE CONTACT (« Besoin d'en parler ? »)
--     Aucune note, aucune réponse, aucun lien avec une humeur.
--     Seule la SEMAINE est stockée (jamais le jour ni l'heure).
-- ---------------------------------------------------------------------
create table public.contact_requests (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  team_id       bigint references public.teams(id) on delete set null,
  destinataire  text not null check (destinataire in ('manager', 'rh')),
  tag           text check (char_length(tag) <= 40),
  preference    text not null check (preference in ('en_personne', 'message')),
  semaine       date not null default date_trunc('week', current_date)::date,  -- lundi de la semaine
  traitee       boolean not null default false
);
create index contact_requests_team_idx on public.contact_requests (team_id, traitee);
alter table public.contact_requests enable row level security;

-- L'employé voit ses propres demandes (pour savoir qu'une demande est en cours)
create policy "voir ses demandes" on public.contact_requests
  for select to authenticated using (user_id = auth.uid());
-- Aucune policy d'écriture : uniquement via les fonctions ci-dessous.

create or replace function public.request_contact(p_destinataire text, p_preference text, p_tag text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_team_id bigint;
begin
  select team_id into v_team_id from public.profiles where id = auth.uid();
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Non authentifié';
  end if;
  if p_destinataire not in ('manager', 'rh') or p_preference not in ('en_personne', 'message') then
    raise exception 'Demande invalide';
  end if;
  if p_destinataire = 'manager' and not exists (
    select 1 from public.teams where id = v_team_id and manager_id is not null and manager_id <> auth.uid()
  ) then
    raise exception 'Pas de manager pour ton équipe';
  end if;
  if exists (
    select 1 from public.contact_requests
    where user_id = auth.uid() and destinataire = p_destinataire and not traitee
  ) then
    raise exception 'Demande déjà en cours';
  end if;

  insert into public.contact_requests (user_id, team_id, destinataire, tag, preference)
  values (auth.uid(), v_team_id, p_destinataire, nullif(trim(p_tag), ''), p_preference);
end;
$$;

-- Manager : les demandes qui lui sont adressées par son équipe. RH : celles adressées aux RH.
create or replace function public.list_contact_requests()
returns table (id bigint, nom text, equipe text, tag text, preference text, semaine date, traitee boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := (select pr.role from public.profiles pr where pr.id = auth.uid());
  v_team bigint;
begin
  if v_role = 'manager' then
    select t.id into v_team from public.teams t where t.manager_id = auth.uid() limit 1;
  elsif v_role is distinct from 'rh' then
    raise exception 'Accès réservé aux managers et RH';
  end if;

  return query
  select c.id, coalesce(p.full_name, u.email)::text, t.name, c.tag, c.preference, c.semaine, c.traitee
  from public.contact_requests c
  join auth.users u on u.id = c.user_id
  left join public.profiles p on p.id = c.user_id
  left join public.teams t on t.id = c.team_id
  where (v_role = 'rh' and c.destinataire = 'rh')
     or (v_role = 'manager' and c.destinataire = 'manager' and c.team_id = v_team)
  order by c.traitee, c.semaine desc, c.id desc;
end;
$$;

create or replace function public.mark_contact_handled(p_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := (select role from public.profiles where id = auth.uid());
begin
  update public.contact_requests c
  set traitee = true
  where c.id = p_id
    and ((v_role = 'rh' and c.destinataire = 'rh')
      or (v_role = 'manager' and c.destinataire = 'manager'
          and c.team_id in (select t.id from public.teams t where t.manager_id = auth.uid())));
  if not found then
    raise exception 'Demande introuvable';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- A3. ANTI-DOUBLON : même message pour la même équipe dans les 60 s refusé
-- ---------------------------------------------------------------------
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
  if exists (
    select 1 from public.team_actions
    where team_id = v_team_id and message = trim(p_message)
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'Action déjà publiée';
  end if;

  insert into public.team_actions (team_id, message, tag)
  values (v_team_id, trim(p_message), nullif(trim(p_tag), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- B1. STATUT + ÉCHÉANCE DES ACTIONS
--     (update_action existe déjà pour le texte : le statut a sa propre fonction)
-- ---------------------------------------------------------------------
alter table public.team_actions
  add column status   text not null default 'prevue' check (status in ('prevue', 'en_cours', 'faite')),
  add column due_date date,
  add column done_at  timestamptz;

create or replace function public.set_action_status(p_id bigint, p_status text, p_due_date date default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_status is null or p_status not in ('prevue', 'en_cours', 'faite') then
    raise exception 'Statut invalide';
  end if;
  update public.team_actions
     set status   = p_status,
         due_date = p_due_date,
         done_at  = case when p_status = 'faite' then coalesce(done_at, now()) end
   where id = p_id
     and team_id in (select id from public.teams where manager_id = auth.uid());
  if not found then
    raise exception 'Action introuvable';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- B2. RÉACTIONS ANONYMES AUX ACTIONS (👍 utile / 👎 insuffisant)
--     action_reactions : les votes, SANS utilisateur
--     action_voters    : qui a voté (SANS la valeur), contre le double vote
-- ---------------------------------------------------------------------
create table public.action_reactions (
  id         bigint generated always as identity primary key,
  action_id  bigint not null references public.team_actions(id) on delete cascade,
  reaction   text not null check (reaction in ('utile', 'insuffisant'))
);
create table public.action_voters (
  action_id  bigint not null references public.team_actions(id) on delete cascade,
  user_id    uuid   not null references auth.users(id) on delete cascade,
  primary key (action_id, user_id)
);
alter table public.action_reactions enable row level security;
alter table public.action_voters    enable row level security;
-- Chacun peut savoir s'il a déjà voté (sa propre ligne), rien d'autre.
create policy "voir ses propres votes" on public.action_voters
  for select to authenticated using (user_id = auth.uid());
-- action_reactions : aucune policy => lecture/écriture uniquement via fonctions.

create or replace function public.react_action(p_action_id bigint, p_reaction text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_team_id bigint;
begin
  select team_id into v_team_id from public.profiles where id = auth.uid() and role = 'employee';
  if v_team_id is null or not exists (
    select 1 from public.team_actions where id = p_action_id and team_id = v_team_id
  ) then
    raise exception 'Action introuvable';
  end if;
  if p_reaction is null or p_reaction not in ('utile', 'insuffisant') then
    raise exception 'Réaction invalide';
  end if;
  insert into public.action_voters (action_id, user_id) values (p_action_id, auth.uid());  -- échoue si déjà voté
  insert into public.action_reactions (action_id, reaction) values (p_action_id, p_reaction);
exception when unique_violation then
  raise exception 'Déjà voté';
end;
$$;

-- Résultats agrégés (manager / RH) : détail seulement à partir de 3 votes
create or replace function public.action_feedback(p_team_id bigint default null)
returns table (action_id bigint, nb_votes int, nb_utile int, nb_insuffisant int)
language plpgsql security definer set search_path = public
as $$
declare
  v_teams bigint[] := public._console_teams(p_team_id);
begin
  return query
  select a.id,
         count(r.id)::int,
         case when count(r.id) >= 3 then (count(*) filter (where r.reaction = 'utile'))::int end,
         case when count(r.id) >= 3 then (count(*) filter (where r.reaction = 'insuffisant'))::int end
  from public.team_actions a
  left join public.action_reactions r on r.action_id = a.id
  where a.team_id = any(v_teams)
  group by a.id;
end;
$$;

-- ---------------------------------------------------------------------
-- B3. ÉVOLUTION DEPUIS L'ACTION : 7 jours clos avant vs 7 jours clos après
--     (jours d'au moins 3 réponses, au moins 3 jours valides de chaque côté)
-- ---------------------------------------------------------------------
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
    group by m.team_id, m.mood_date having count(*) >= 3
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

-- ---------------------------------------------------------------------
-- B4. COMPARAISON À L'ENTREPRISE (journées closes, ≥ 3 réponses, ≥ 2 équipes)
-- ---------------------------------------------------------------------
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
    group by m.team_id, m.mood_date having count(*) >= 3
  ),
  par_equipe as (select j.tid, avg(j.moy) as moy from jours j group by j.tid)
  select
    (select round(pe.moy, 1) from par_equipe pe where pe.tid = v_team),
    case when (select count(*) from par_equipe) >= 2 then (select round(avg(pe.moy), 1) from par_equipe pe) end,
    (select count(*)::int from par_equipe);
end;
$$;

-- ---------------------------------------------------------------------
-- DROITS
-- ---------------------------------------------------------------------
revoke execute on function public._require_team_size(bigint[]) from public, anon, authenticated;

revoke execute on function public.console_topics(int, bigint)            from public, anon;
revoke execute on function public.company_overview()                     from public, anon;
revoke execute on function public.submit_report(text[])                  from public, anon;
revoke execute on function public.request_contact(text, text, text)      from public, anon;
revoke execute on function public.list_contact_requests()                from public, anon;
revoke execute on function public.mark_contact_handled(bigint)           from public, anon;
revoke execute on function public.set_action_status(bigint, text, date)  from public, anon;
revoke execute on function public.react_action(bigint, text)             from public, anon;
revoke execute on function public.action_feedback(bigint)                from public, anon;
revoke execute on function public.action_impact(bigint)                  from public, anon;
revoke execute on function public.company_benchmark(int, bigint)         from public, anon;

grant execute on function public.console_topics(int, bigint)            to authenticated;
grant execute on function public.company_overview()                     to authenticated;
grant execute on function public.submit_report(text[])                  to authenticated;
grant execute on function public.request_contact(text, text, text)      to authenticated;
grant execute on function public.list_contact_requests()                to authenticated;
grant execute on function public.mark_contact_handled(bigint)           to authenticated;
grant execute on function public.set_action_status(bigint, text, date)  to authenticated;
grant execute on function public.react_action(bigint, text)             to authenticated;
grant execute on function public.action_feedback(bigint)                to authenticated;
grant execute on function public.action_impact(bigint)                  to authenticated;
grant execute on function public.company_benchmark(int, bigint)         to authenticated;
