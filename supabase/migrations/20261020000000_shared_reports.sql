-- =====================================================================
--  WORKZEN : questionnaires partagés avec son nom (fiche et historique par salarié)
--  À exécuter APRÈS 20261019000000_report_comments.sql (SQL Editor > Run)
--
--  Règle : c'est le salarié qui décide, à la question 4 du questionnaire
--  (« Aimerais-tu en parler à quelqu'un ? »).
--    - « Oui, à mon manager » -> réponses + commentaire transmis AVEC son nom à son manager ;
--    - « Oui, aux RH »        -> idem, aux RH ;
--    - « Non » / « à un collègue » -> questionnaire anonyme, comme avant.
--  Un questionnaire partagé n'entre PAS dans les statistiques anonymes : sinon, en le
--  retranchant, le manager pourrait déduire les réponses anonymes des autres (sous le seuil de 3).
--  L'humeur du jour (note) reste toujours anonyme : elle n'est jamais copiée ici.
-- =====================================================================

create table if not exists public.shared_reports (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  team_id       bigint references public.teams(id) on delete set null,
  destinataire  text not null check (destinataire in ('manager', 'rh')),
  report_date   date not null default current_date,
  answers       text[] not null check (array_length(answers, 1) = 5),
  commentaire   text check (commentaire is null or char_length(commentaire) between 1 and 500),
  traitee       boolean not null default false
);
create index if not exists shared_reports_user_idx on public.shared_reports (user_id, report_date desc);
create index if not exists shared_reports_team_idx on public.shared_reports (team_id, destinataire);

-- Aucune policy : lecture et écriture uniquement via les fonctions ci-dessous
alter table public.shared_reports enable row level security;

-- Envoi du questionnaire : anonyme ou partagé selon la réponse à la question 4
create or replace function public.submit_report(p_answers text[], p_comment text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_comment text := nullif(btrim(p_comment), '');
  v_dest text;
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
  if v_dest = 'manager' and not exists (select 1 from public.teams where id = v_profile.team_id and manager_id is not null) then
    raise exception 'Pas de manager pour cette équipe';
  end if;

  if v_dest is null then
    insert into public.reports (team_id, answers, commentaire) values (v_profile.team_id, p_answers, v_comment);
  else
    insert into public.shared_reports (user_id, team_id, destinataire, answers, commentaire)
    values (auth.uid(), v_profile.team_id, v_dest, p_answers, v_comment);
  end if;
  update public.profiles set last_report_date = current_date where id = auth.uid();
end;
$$;

-- Périmètre de lecture : manager = questionnaires adressés au manager de SON équipe ; RH = ceux adressés aux RH
create or replace function public._shared_reports_visible()
returns setof public.shared_reports
language plpgsql stable security definer set search_path = public
as $$
declare
  v_role text := (select role from public.profiles where id = auth.uid());
begin
  if v_role = 'manager' then
    return query select s.* from public.shared_reports s
    where s.destinataire = 'manager'
      and s.team_id in (select t.id from public.teams t where t.manager_id = auth.uid());
  elsif v_role = 'rh' then
    return query select s.* from public.shared_reports s where s.destinataire = 'rh';
  else
    raise exception 'Accès réservé aux managers et RH';
  end if;
end;
$$;
revoke execute on function public._shared_reports_visible() from public, anon, authenticated;

-- Liste des salariés qui ont partagé au moins un questionnaire (pour les fiches)
create or replace function public.shared_report_people()
returns table (user_id uuid, nom text, equipe text, nb int, dernier date, a_traiter int)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  select s.user_id, coalesce(p.full_name, u.email)::text, t.name,
    count(*)::int, max(s.report_date), (count(*) filter (where not s.traitee))::int
  from public._shared_reports_visible() s
  join auth.users u on u.id = s.user_id
  left join public.profiles p on p.id = s.user_id
  left join public.teams t on t.id = p.team_id
  group by s.user_id, p.full_name, u.email, t.name
  order by 6 desc, 5 desc;
end;
$$;

-- Historique d'un salarié : ses questionnaires partagés, du plus récent au plus ancien
create or replace function public.shared_report_history(p_user uuid)
returns table (id bigint, report_date date, answers text[], commentaire text, traitee boolean)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  select s.id, s.report_date, s.answers, s.commentaire, s.traitee
  from public._shared_reports_visible() s
  where s.user_id = p_user
  order by s.report_date desc, s.id desc;
end;
$$;

create or replace function public.mark_shared_report_handled(p_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public._shared_reports_visible() s where s.id = p_id) then
    raise exception 'Questionnaire introuvable';
  end if;
  update public.shared_reports set traitee = true where id = p_id;
end;
$$;

-- Le salarié voit ce qu'il a lui-même partagé (transparence)
create or replace function public.my_shared_reports()
returns table (report_date date, destinataire text, answers text[], commentaire text, traitee boolean)
language sql stable security definer set search_path = public
as $$
  select s.report_date, s.destinataire, s.answers, s.commentaire, s.traitee
  from public.shared_reports s
  where s.user_id = auth.uid()
  order by s.report_date desc, s.id desc;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.submit_report(text[], text)', 'public.shared_report_people()', 'public.shared_report_history(uuid)',
    'public.mark_shared_report_handled(bigint)', 'public.my_shared_reports()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
