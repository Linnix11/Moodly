-- =====================================================================
--  WORKZEN — Questionnaire après une mauvaise humeur (à coller dans
--  SQL Editor > New query > Run, APRÈS la migration init)
--  Principe : un rapport anonyme n'a NI user_id NI score, et pas d'heure.
--  Le manager ne le voit qu'en agrégé, et seulement à partir de 3 rapports
--  anonymes sur 30 jours. Un rapport nominatif est visible avec le nom.
-- =====================================================================

-- 1. PROFILS : 1 rapport par jour maximum ---------------------------------
alter table public.profiles add column last_report_date date;

-- 2. RAPPORTS -------------------------------------------------------------
create table public.reports (
  id           bigint generated always as identity primary key,
  team_id      bigint not null references public.teams(id) on delete cascade,
  report_date  date not null default current_date,
  answers      text[] not null check (array_length(answers, 1) = 5),
  user_id      uuid references auth.users(id) on delete cascade,  -- NULL = anonyme
  score        smallint check (score between 1 and 2),            -- NULL = anonyme
  check ((user_id is null) = (score is null))
);
create index reports_team_date_idx on public.reports (team_id, report_date);

-- reports : AUCUNE policy => aucune lecture/écriture directe possible.
alter table public.reports enable row level security;

-- 3. FONCTION : ENVOYER SON RAPPORT ---------------------------------------
create or replace function public.submit_report(p_answers text[], p_anonymous boolean, p_score int default null)
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
  if not p_anonymous and (p_score is null or p_score not between 1 and 2) then
    raise exception 'Score invalide';
  end if;

  insert into public.reports (team_id, answers, user_id, score)
  values (
    v_profile.team_id,
    p_answers,
    case when p_anonymous then null else auth.uid() end,
    case when p_anonymous then null else p_score end
  );

  update public.profiles set last_report_date = current_date where id = auth.uid();
end;
$$;

-- 4. FONCTION : RAPPORTS NOMINATIFS DE L'ÉQUIPE (manager, 30 jours) -------
create or replace function public.team_reports()
returns table (report_date date, full_name text, score smallint, answers text[])
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
  select r.report_date, coalesce(p.full_name, u.email)::text, r.score, r.answers
  from public.reports r
  join auth.users u on u.id = r.user_id
  left join public.profiles p on p.id = r.user_id
  where r.team_id = v_team_id
    and r.user_id is not null
    and r.report_date >= current_date - 29
  order by r.report_date desc, coalesce(p.full_name, u.email);
end;
$$;

-- 5. FONCTION : TENDANCES ANONYMES (manager, 30 jours, agrégées) ----------
--    Seuil d'anonymat : rien n'est renvoyé sous 3 rapports anonymes.
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

  if (select count(*) from public.reports r
      where r.team_id = v_team_id and r.user_id is null
        and r.report_date >= current_date - 29) < 3 then
    return;
  end if;

  return query
  select q.ord::int, q.a, count(*)::int
  from public.reports r, unnest(r.answers) with ordinality as q(a, ord)
  where r.team_id = v_team_id
    and r.user_id is null
    and r.report_date >= current_date - 29
  group by q.ord, q.a
  order by q.ord, count(*) desc;
end;
$$;

-- 6. DROITS D'EXÉCUTION : seulement les utilisateurs connectés -----------
revoke execute on function public.submit_report(text[], boolean, int) from public, anon;
revoke execute on function public.team_reports()                      from public, anon;
revoke execute on function public.team_report_summary()               from public, anon;
grant  execute on function public.submit_report(text[], boolean, int) to authenticated;
grant  execute on function public.team_reports()                      to authenticated;
grant  execute on function public.team_report_summary()               to authenticated;
