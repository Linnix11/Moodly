-- =====================================================================
--  WORKZEN : sujets personnalisés (créés par les RH et les managers)
--  À exécuter APRÈS 20261021000000_team_sharing.sql (SQL Editor > Run). Relançable.
--
--  - Les 7 sujets de base restent (ils ont des fiches conseil et des pistes d'action).
--  - La RH crée des sujets pour toute l'entreprise ; un manager, pour son équipe seulement.
--  - Un sujet n'est jamais supprimé (l'historique des humeurs le cite) : on le retire.
--  - Un salarié ne peut choisir QUE des sujets existants et actifs pour son équipe :
--    pas de texte libre dans les sujets, qui pourrait permettre de l'identifier.
-- =====================================================================

create table if not exists public.topics (
  id          bigint generated always as identity primary key,
  label       text not null check (char_length(label) between 2 and 40),
  team_id     bigint references public.teams(id) on delete cascade, -- NULL = toute l'entreprise
  base        boolean not null default false,
  active      boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
-- Un même libellé (sans tenir compte de la casse) une seule fois par périmètre
create unique index if not exists topics_label_scope_idx on public.topics (coalesce(team_id, 0), lower(label));
alter table public.topics enable row level security; -- aucune policy : accès via fonctions

-- Les 7 sujets de base (mêmes libellés que TAGS dans lib/constants.ts)
insert into public.topics (label, base)
select l, true from unnest(array[
  'Charge de travail', 'Ambiance d''équipe', 'Management', 'Reconnaissance',
  'Équilibre pro/perso', 'Environnement de travail', 'Sens du travail'
]) l
where not exists (select 1 from public.topics t where t.team_id is null and lower(t.label) = lower(l));

-- Équipe de l'utilisateur : la sienne (employé) ou celle qu'il gère (manager)
create or replace function public._my_team()
returns bigint
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select team_id from public.profiles where id = auth.uid()),
    (select id from public.teams where manager_id = auth.uid() limit 1)
  );
$$;
revoke execute on function public._my_team() from public, anon, authenticated;

-- 1. SUJETS PROPOSÉS (employé, manager) : base + entreprise + équipe, actifs ----------
create or replace function public.available_topics()
returns table (label text, base boolean, equipe boolean)
language sql stable security definer set search_path = public
as $$
  select t.label, t.base, t.team_id is not null
  from public.topics t
  where t.active and (t.team_id is null or t.team_id = public._my_team())
  order by t.base desc, t.team_id nulls first, t.label;
$$;

-- 2. GESTION (manager : base + entreprise + son équipe ; RH : base + entreprise + toutes les équipes)
create or replace function public.manage_topics_list()
returns table (id bigint, label text, base boolean, active boolean, equipe text, modifiable boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := (select p.role from public.profiles p where p.id = auth.uid());
  v_team bigint;
begin
  if v_role = 'manager' then
    select tm.id into v_team from public.teams tm where tm.manager_id = auth.uid() limit 1;
    if v_team is null then
      raise exception 'Aucune équipe gérée';
    end if;
    return query
    select t.id, t.label, t.base, t.active, tm.name, (t.team_id = v_team)
    from public.topics t left join public.teams tm on tm.id = t.team_id
    where t.team_id is null or t.team_id = v_team
    order by t.base desc, t.team_id nulls first, t.label;
  elsif v_role = 'rh' then
    return query
    select t.id, t.label, t.base, t.active, tm.name, not t.base
    from public.topics t left join public.teams tm on tm.id = t.team_id
    order by t.base desc, t.team_id nulls first, tm.name, t.label;
  else
    raise exception 'Accès réservé aux managers et RH';
  end if;
end;
$$;

create or replace function public.create_topic(p_label text)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := (select role from public.profiles where id = auth.uid());
  v_label text := regexp_replace(btrim(p_label), '\s+', ' ', 'g');
  v_team bigint;
  v_id bigint;
begin
  if v_role = 'manager' then
    select id into v_team from public.teams where manager_id = auth.uid() limit 1;
    if v_team is null then
      raise exception 'Aucune équipe gérée';
    end if;
  elsif v_role is distinct from 'rh' then
    raise exception 'Accès réservé aux managers et RH';
  end if;

  if v_label is null or char_length(v_label) not between 2 and 40 then
    raise exception 'Sujet : entre 2 et 40 caractères';
  end if;
  -- Libellé d'une catégorie, pas une phrase : lettres, chiffres, espaces et ponctuation simple
  if v_label !~ '^[[:alnum:] ''’/&().,+-]+$' then
    raise exception 'Sujet : caractères non autorisés';
  end if;
  -- Pas de doublon avec un sujet de base, de l'entreprise ou de cette équipe (actif ou retiré)
  if exists (
    select 1 from public.topics t
    where lower(t.label) = lower(v_label) and (t.team_id is null or t.team_id = v_team)
  ) then
    raise exception 'Ce sujet existe déjà';
  end if;
  if (select count(*) from public.topics t
      where not t.base and t.active and t.team_id is not distinct from v_team) >= 15 then
    raise exception 'Maximum 15 sujets personnalisés';
  end if;

  insert into public.topics (label, team_id, created_by) values (v_label, v_team, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Retirer / remettre un sujet personnalisé (jamais les sujets de base)
create or replace function public.set_topic_active(p_id bigint, p_active boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := (select role from public.profiles where id = auth.uid());
begin
  update public.topics t
  set active = p_active
  where t.id = p_id and not t.base
    and (v_role = 'rh'
      or (v_role = 'manager' and t.team_id in (select tm.id from public.teams tm where tm.manager_id = auth.uid())));
  if not found then
    raise exception 'Sujet introuvable';
  end if;
end;
$$;

-- 3. SAISIE DE L'HUMEUR : uniquement des sujets proposés à l'équipe (reprend 20261021000000) ----
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
  if exists (
    select 1 from unnest(coalesce(p_tags, '{}')) tg
    where not exists (
      select 1 from public.topics t
      where t.active and t.label = tg and (t.team_id is null or t.team_id = v_profile.team_id)
    )
  ) then
    raise exception 'Sujet inconnu';
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

do $$
declare f text;
begin
  foreach f in array array[
    'public.available_topics()', 'public.manage_topics_list()', 'public.create_topic(text)',
    'public.set_topic_active(bigint, boolean)', 'public.submit_mood(int, text[])'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
