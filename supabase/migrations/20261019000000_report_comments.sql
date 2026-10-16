-- =====================================================================
--  WORKZEN : commentaire libre et facultatif dans le questionnaire
--  À exécuter APRÈS 20261018000000_legal.sql (SQL Editor > Run)
--  Règles d'anonymat du commentaire :
--    - stocké dans reports, qui n'a AUCUN lien avec l'utilisateur ;
--    - lu sans date ni réponses associées, dans un ordre aléatoire ;
--    - journées closes uniquement, et rien sous 3 commentaires sur la période.
-- =====================================================================

alter table public.reports
  add column if not exists commentaire text
  check (commentaire is null or char_length(commentaire) between 1 and 500);

-- Remplace submit_report(text[]) : une seule signature, sinon l'appel serait ambigu
drop function if exists public.submit_report(text[]);

create or replace function public.submit_report(p_answers text[], p_comment text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_comment text := nullif(btrim(p_comment), '');
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

  insert into public.reports (team_id, answers, commentaire) values (v_profile.team_id, p_answers, v_comment);
  update public.profiles set last_report_date = current_date where id = auth.uid();
end;
$$;

revoke execute on function public.submit_report(text[], text) from public, anon;
grant  execute on function public.submit_report(text[], text) to authenticated;

-- Commentaires d'un périmètre (fonction interne) : rien sous 3, ordre aléatoire, sans date
create or replace function public._report_comments(p_teams bigint[], p_days int)
returns table (commentaire text)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public._require_team_size(p_teams);
  if (select count(*) from public.reports r
      where r.team_id = any(p_teams) and r.commentaire is not null
        and r.report_date between current_date - p_days and current_date - 1) < 3 then
    return;
  end if;

  return query
  select r.commentaire from public.reports r
  where r.team_id = any(p_teams) and r.commentaire is not null
    and r.report_date between current_date - p_days and current_date - 1
  order by random();
end;
$$;
revoke execute on function public._report_comments(bigint[], int) from public, anon, authenticated;

-- Manager (app mobile) : son équipe, 30 derniers jours
create or replace function public.team_report_comments()
returns table (commentaire text)
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
  return query select * from public._report_comments(array[v_team_id], 30);
end;
$$;

-- Console (manager : son équipe ; RH : une équipe ou toutes), période au choix
create or replace function public.console_report_comments(p_days int, p_team_id bigint default null)
returns table (commentaire text)
language plpgsql security definer set search_path = public
as $$
begin
  if p_days not between 7 and 365 then
    raise exception 'Période invalide';
  end if;
  return query select * from public._report_comments(public._console_teams(p_team_id), p_days);
end;
$$;

revoke execute on function public.team_report_comments() from public, anon;
grant  execute on function public.team_report_comments() to authenticated;
revoke execute on function public.console_report_comments(int, bigint) from public, anon;
grant  execute on function public.console_report_comments(int, bigint) to authenticated;
