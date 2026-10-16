-- =====================================================================
--  WORKZEN : tests de sécurité (« Prove it, instead of faking it »)
--  À exécuter dans Supabase > SQL Editor APRÈS migration + seed.
--  Chaque test se fait dans une transaction annulée (ROLLBACK) :
--  rien n'est modifié dans la base.
--
--  Principe : on « se fait passer » pour un utilisateur connecté en
--  remplissant request.jwt.claims (c'est ce que fait Supabase avec le JWT),
--  puis on prend le rôle Postgres "authenticated".
--
--  Résultat attendu : chaque test affiche une ligne « ✅ ... ».
--  Astuce : le SQL Editor n'affiche que le DERNIER résultat ; pour tout
--  voir, sélectionnez un bloc (begin … rollback) et faites « Run selected ».
--  Faites une capture d'écran du résultat pour la doc et la vidéo.
-- =====================================================================

create or replace function pg_temp.login_as(p_email text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select id from auth.users where email = p_email), 'role', 'authenticated')::text,
    true);
  execute 'set local role authenticated';
end $$;

-- Teste un appel qui DOIT échouer : renvoie le message d'erreur, ou NULL si l'appel a réussi.
create or replace function pg_temp.expect_error(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return null;
exception when others then
  return sqlerrm;
end $$;

-- ⚠️ SEULE LIGNE À ADAPTER : l'email du manager de l'équipe de démo.
--    L'employé de test est pris automatiquement dans son équipe (au moins 3 employés requis).
create or replace function pg_temp.demo_manager() returns text
language sql as $$ select 'manager@workzen.dev'::text $$;

create or replace function pg_temp.demo_employee() returns text
language sql as $$
  select u.email::text from auth.users u
  join public.profiles p on p.id = u.id
  where p.role = 'employee'
    and p.team_id = (select t.id from public.teams t
                     where t.manager_id = (select id from auth.users where email = pg_temp.demo_manager()) limit 1)
  order by u.email limit 1
$$;

-- TEST 1 : un employé ne peut PAS lire la table moods directement
begin;
  select pg_temp.login_as(pg_temp.demo_employee());
  select case when count(*) = 0
              then '✅ TEST 1 : lecture directe de moods bloquée (0 ligne visible)'
              else '❌ TEST 1 : ' || count(*) || ' lignes visibles !' end as resultat
  from public.moods;
rollback;

-- TEST 2 : un employé ne voit que SON profil
begin;
  select pg_temp.login_as(pg_temp.demo_employee());
  select case when count(*) = 1
              then '✅ TEST 2 : un employé ne voit que son propre profil'
              else '❌ TEST 2 : ' || count(*) || ' profils visibles !' end as resultat
  from public.profiles;
rollback;

-- TEST 3 : un employé ne peut PAS appeler les stats manager
begin;
  select pg_temp.login_as(pg_temp.demo_employee());
  select coalesce('✅ TEST 3 : stats refusées à un employé (' || pg_temp.expect_error('select public.team_stats()') || ')',
                  '❌ TEST 3 : un employé a pu lire les stats !') as resultat;
rollback;

-- TEST 4 : impossible de saisir 2 fois le même jour
begin;
  select pg_temp.login_as(pg_temp.demo_employee());
  -- 1re saisie (peut échouer si déjà faite aujourd'hui, ce n'est pas grave)
  select pg_temp.expect_error('select public.submit_mood(4, array[''Reconnaissance''])');
  -- 2e saisie : DOIT échouer
  select coalesce('✅ TEST 4 : double saisie refusée (' || pg_temp.expect_error('select public.submit_mood(2)') || ')',
                  '❌ TEST 4 : double saisie acceptée !') as resultat;
rollback;

-- TEST 5 : un employé ne peut pas s'auto-promouvoir manager
begin;
  select pg_temp.login_as(pg_temp.demo_employee());
  update public.profiles set role = 'manager' where id = auth.uid();
  select case when role = 'employee'
              then '✅ TEST 5 : impossible de modifier son rôle (aucune policy UPDATE)'
              else '❌ TEST 5 : rôle modifié !' end as resultat
  from public.profiles where id = auth.uid();
rollback;

-- TEST 6 : la table moods ne contient AUCUNE colonne liée à l'utilisateur
select case when count(*) = 0
            then '✅ TEST 6 : aucune colonne utilisateur dans moods (anonymat par conception)'
            else '❌ TEST 6 : colonne(s) suspecte(s) : ' || string_agg(column_name, ', ') end as resultat
from information_schema.columns
where table_schema = 'public' and table_name = 'moods'
  and column_name ~ '(user|profile|author|email|owner)';

-- TEST 7 : le manager reçoit 30 jours agrégés, jours < 3 réponses masqués
begin;
  select pg_temp.login_as(pg_temp.demo_manager());
  select case when count(*) = 30
               and bool_and(moyenne is null or nb_reponses >= 3)
              then '✅ TEST 7 : 30 jours agrégés, moyenne masquée sous 3 réponses'
              else '❌ TEST 7 : résultat inattendu' end as resultat
  from public.team_stats();
rollback;

-- =====================================================================
--  RAPPORTS (questionnaire après une mauvaise humeur)
--  À exécuter APRÈS la migration 20261014000000_reports.sql
-- =====================================================================

-- TEST 8 : un employé ne peut PAS lire la table reports directement
begin;
  update public.profiles set last_report_date = null
  where id = (select id from auth.users where email = pg_temp.demo_employee());
  select pg_temp.login_as(pg_temp.demo_employee());
  select public.submit_report(array['charge','quelques_jours','beaucoup','manager','soutien']);
  select case when count(*) = 0
              then '✅ TEST 8 : lecture directe de reports bloquée (0 ligne visible)'
              else '❌ TEST 8 : ' || count(*) || ' lignes visibles !' end as resultat
  from public.reports;
rollback;

-- TEST 9 : plus aucun rapport nominatif (fonction team_reports supprimée en v3)
select case when to_regprocedure('public.team_reports()') is null
            then '✅ TEST 9 : aucune fonction ne renvoie de rapport nominatif'
            else '❌ TEST 9 : team_reports existe encore !' end as resultat;

-- TEST 10 : la table reports ne contient ni utilisateur ni note
select case when count(*) = 0
            then '✅ TEST 10 : reports sans colonne utilisateur ni note (anonymat par conception)'
            else '❌ TEST 10 : colonne(s) suspecte(s) : ' || string_agg(column_name, ', ') end as resultat
from information_schema.columns
where table_schema = 'public' and table_name = 'reports'
  and column_name ~ '(user|profile|author|email|owner|score)';

-- TEST 11 : impossible d'envoyer 2 rapports le même jour
begin;
  update public.profiles set last_report_date = null
  where id = (select id from auth.users where email = pg_temp.demo_employee());
  select pg_temp.login_as(pg_temp.demo_employee());
  select public.submit_report(array['charge','quelques_jours','beaucoup','non','soutien']);
  select coalesce('✅ TEST 11 : double rapport refusé (' || pg_temp.expect_error(
                    'select public.submit_report(array[''charge'',''quelques_jours'',''beaucoup'',''non'',''soutien''])') || ')',
                  '❌ TEST 11 : double rapport accepté !') as resultat;
rollback;

-- TEST 12 : tendances anonymes masquées sous 3 rapports (journées closes)
begin;
  delete from public.reports
  where team_id = (select id from public.teams where manager_id = (select id from auth.users where email = pg_temp.demo_manager()));
  insert into public.reports (team_id, answers, report_date)
  select t.id, array['charge','quelques_jours','beaucoup','non','soutien'], current_date - 1
  from public.teams t, generate_series(1, 2)
  where t.manager_id = (select id from auth.users where email = pg_temp.demo_manager());
  select pg_temp.login_as(pg_temp.demo_manager());
  select case when count(*) = 0
              then '✅ TEST 12 : 2 rapports anonymes => rien d''affiché'
              else '❌ TEST 12 : tendances visibles avec seulement 2 rapports !' end as resultat
  from public.team_report_summary();
rollback;

-- ===================== Tests v2 (après 20261015000000_features_v2.sql) =====================

-- TEST 13 : les stats manager n'incluent PAS la journée en cours (anti-recalcul d'une note)
begin;
  select pg_temp.login_as(pg_temp.demo_manager());
  select case when max(jour) = current_date - 1 and count(*) = 30
              then '✅ TEST 13 : stats limitées aux journées terminées (aujourd''hui exclu)'
              else '❌ TEST 13 : la journée en cours est exposée !' end as resultat
  from public.team_stats();
rollback;

-- TEST 14 : un employé ne peut pas publier d'action (ni via la fonction, ni en direct)
begin;
  select pg_temp.login_as(pg_temp.demo_employee());
  select case when pg_temp.expect_error('select public.publish_action(''Je me nomme manager'')') is not null
               and pg_temp.expect_error('insert into public.team_actions(team_id, message) values (1, ''piratage'')') is not null
              then '✅ TEST 14 : publication d''action refusée à un employé'
              else '❌ TEST 14 : un employé a pu publier une action !' end as resultat;
rollback;

-- TEST 15 : la météo d'équipe ne donne jamais la moyenne du jour en cours
select case when pg_get_function_result('public.team_pulse()'::regprocedure) !~ 'aujourdhui_(moyenne|top)'
            then '✅ TEST 15 : team_pulse n''expose que le nombre de réponses du jour'
            else '❌ TEST 15 : team_pulse expose une donnée du jour' end as resultat;

-- ===================== Console web (après 20261016000000_console_web.sql) =====================
-- Les tests RH promeuvent temporairement un compte en RH (annulé par le ROLLBACK).

-- TEST 16 : un employé n'a pas accès aux stats de la console
begin;
  select pg_temp.login_as(pg_temp.demo_employee());
  select coalesce('✅ TEST 16 : console refusée à un employé (' || pg_temp.expect_error('select public.console_stats(30)') || ')',
                  '❌ TEST 16 : un employé a pu lire les stats de la console !') as resultat;
rollback;

-- TEST 17 : un manager ne peut pas lire une autre équipe
begin;
  -- l'id est mémorisé AVANT la connexion : le manager ne voit pas cette équipe (RLS)
  with t as (insert into public.teams (name) values ('Équipe test 17') returning id)
  select set_config('test.autre_equipe', (select id::text from t), true);
  select pg_temp.login_as(pg_temp.demo_manager());
  select coalesce('✅ TEST 17 : autre équipe refusée au manager (' || pg_temp.expect_error(
                    'select public.console_stats(30, current_setting(''test.autre_equipe'')::bigint)') || ')',
                  '❌ TEST 17 : un manager a lu une autre équipe !') as resultat;
rollback;

-- TEST 18 : un manager ne peut pas gérer les comptes
begin;
  select pg_temp.login_as(pg_temp.demo_manager());
  select coalesce('✅ TEST 18 : gestion des comptes refusée au manager (' || pg_temp.expect_error('select public.rh_list_users()') || ')',
                  '❌ TEST 18 : un manager a pu lister les comptes !') as resultat;
rollback;

-- TEST 19 : la console n'expose jamais la journée en cours
begin;
  select pg_temp.login_as(pg_temp.demo_manager());
  select case when max(jour) = current_date - 1 and count(*) = 90
              then '✅ TEST 19 : console limitée aux journées terminées'
              else '❌ TEST 19 : la journée en cours est exposée !' end as resultat
  from public.console_stats(90);
rollback;

-- TEST 20 : la RH ne voit pas les demandes de contact adressées aux managers
begin;
  insert into public.contact_requests (user_id, team_id, destinataire, preference)
  select p.id, p.team_id, 'manager', 'message' from public.profiles p
  where p.id = (select id from auth.users where email = pg_temp.demo_employee());
  update public.profiles set role = 'rh' where id = (select id from auth.users where email = pg_temp.demo_manager());
  select pg_temp.login_as(pg_temp.demo_manager());
  select case when count(*) = 0
              then '✅ TEST 20 : la RH ne voit pas les demandes adressées aux managers'
              else '❌ TEST 20 : la RH voit des demandes destinées aux managers !' end as resultat
  from public.list_contact_requests();
rollback;

-- TEST 21 : un RH ne peut pas retirer son propre rôle RH
begin;
  update public.profiles set role = 'rh' where id = (select id from auth.users where email = pg_temp.demo_employee());
  select pg_temp.login_as(pg_temp.demo_employee());
  select coalesce('✅ TEST 21 : impossible de retirer son propre rôle RH (' || pg_temp.expect_error(
                    'select public.rh_set_user(auth.uid(), ''employee'')') || ')',
                  '❌ TEST 21 : un RH a retiré son propre rôle !') as resultat;
rollback;

-- TEST 22 : un employé ne peut pas se promouvoir via les fonctions RH
begin;
  select pg_temp.login_as(pg_temp.demo_employee());
  select coalesce('✅ TEST 22 : auto-promotion refusée (' || pg_temp.expect_error(
                    'select public.rh_set_user(auth.uid(), ''rh'')') || ')',
                  '❌ TEST 22 : un employé s''est promu RH !') as resultat;
rollback;

-- ===================== v3 (après 20261017000000_v3.sql) =====================

-- TEST 23 : une demande de contact ne contient ni note ni date au jour près
begin;
  update public.contact_requests set traitee = true
  where user_id = (select id from auth.users where email = pg_temp.demo_employee());
  select pg_temp.login_as(pg_temp.demo_employee());
  select public.request_contact('manager', 'en_personne', 'Management');
  reset role;
  select pg_temp.login_as(pg_temp.demo_manager());
  select case when pg_get_function_result('public.list_contact_requests()'::regprocedure) !~ '(score|timestamp|time)'
               and (select bool_and(semaine = date_trunc('week', semaine)::date) from public.list_contact_requests())
               and not exists (select 1 from information_schema.columns
                               where table_schema = 'public' and table_name = 'contact_requests'
                                 and (column_name ~ '(score|mood|answer)' or data_type like 'timestamp%'))
              then '✅ TEST 23 : demande de contact sans note ni date exacte (semaine seulement)'
              else '❌ TEST 23 : la demande de contact expose une note ou une date exacte !' end as resultat;
rollback;

-- TEST 24 : une équipe de moins de 3 employés a ses statistiques masquées
begin;
  -- on retire tous les employés sauf 2 de l'équipe de démo (annulé par le ROLLBACK)
  update public.profiles set team_id = null
  where role = 'employee'
    and team_id = (select id from public.teams where manager_id = (select id from auth.users where email = pg_temp.demo_manager()))
    and id not in (
      select p.id from public.profiles p
      where p.role = 'employee'
        and p.team_id = (select id from public.teams where manager_id = (select id from auth.users where email = pg_temp.demo_manager()))
      order by p.id limit 2);
  select pg_temp.login_as(pg_temp.demo_manager());
  select coalesce('✅ TEST 24 : équipe de moins de 3 personnes masquée (' || pg_temp.expect_error('select public.team_stats()') || ')',
                  '❌ TEST 24 : les stats d''une équipe de 2 personnes sont visibles !') as resultat;
rollback;

-- TEST 25 : une double publication en moins de 60 s est refusée
begin;
  select pg_temp.login_as(pg_temp.demo_manager());
  select public.publish_action('Point priorités lundi matin');
  select coalesce('✅ TEST 25 : double publication refusée (' || pg_temp.expect_error(
                    'select public.publish_action(''Point priorités lundi matin'')') || ')',
                  '❌ TEST 25 : la même action a été publiée deux fois !') as resultat;
rollback;

-- TEST 26 : un employé ne lit pas action_reactions, ne vote pas 2 fois, ne change pas le statut
begin;
  with a as (
    insert into public.team_actions (team_id, message)
    select id, 'Action de test 26' from public.teams
    where manager_id = (select id from auth.users where email = pg_temp.demo_manager())
    returning id)
  select set_config('test.action', (select id::text from a), true);
  select pg_temp.login_as(pg_temp.demo_employee());
  select public.react_action(current_setting('test.action')::bigint, 'utile');
  select case when (select count(*) from public.action_reactions) = 0
               and pg_temp.expect_error('select public.react_action(current_setting(''test.action'')::bigint, ''insuffisant'')') is not null
               and pg_temp.expect_error('select public.set_action_status(current_setting(''test.action'')::bigint, ''faite'')') is not null
              then '✅ TEST 26 : réactions illisibles, double vote et changement de statut refusés à un employé'
              else '❌ TEST 26 : un employé a lu les réactions, revoté ou changé un statut !' end as resultat;
rollback;

-- TEST 27 : action_feedback masque le détail sous 3 votes
begin;
  with a as (
    insert into public.team_actions (team_id, message)
    select id, 'Action de test 27' from public.teams
    where manager_id = (select id from auth.users where email = pg_temp.demo_manager())
    returning id)
  select set_config('test.action', (select id::text from a), true);
  insert into public.action_reactions (action_id, reaction)
  values (current_setting('test.action')::bigint, 'utile'), (current_setting('test.action')::bigint, 'insuffisant');
  select pg_temp.login_as(pg_temp.demo_manager());
  select case when nb_votes = 2 and nb_utile is null and nb_insuffisant is null
              then '✅ TEST 27 : moins de 3 votes => détail masqué'
              else '❌ TEST 27 : le détail des votes est visible sous 3 votes !' end as resultat
  from public.action_feedback() where action_id = current_setting('test.action')::bigint;
rollback;
