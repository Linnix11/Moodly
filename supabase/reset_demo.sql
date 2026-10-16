-- =====================================================================
--  WORKZEN (projet MOODLY) : remise à zéro des données de démo
--  Vide les données de l'« Équipe Produit » (humeurs, questionnaires, actions,
--  réactions, demandes de contact) puis génère 60 jours cohérents.
--  Ne touche NI aux comptes NI au schéma. Relançable à volonté.
--  Prérequis : seed.sql (équipe + au moins 3 employés, 5 recommandés).
-- =====================================================================

-- 1. Nettoyage (les réactions et votes partent avec les actions : on delete cascade)
delete from public.contact_requests where team_id = (select id from public.teams where name = 'Équipe Produit');
delete from public.team_actions     where team_id = (select id from public.teams where name = 'Équipe Produit');
delete from public.reports          where team_id = (select id from public.teams where name = 'Équipe Produit');
delete from public.moods            where team_id = (select id from public.teams where name = 'Équipe Produit');
update public.profiles set last_mood_date = null, last_report_date = null
where team_id = (select id from public.teams where name = 'Équipe Produit');

-- 2. Humeurs des 60 derniers jours clos : AU PLUS une réponse par employé et par jour.
--    Histoire de la démo : charge qui monte (J-30 à J-21), une action à J-20,
--    le moral remonte, puis rechute la dernière semaine (bannière « À surveiller »).
--    Jours creux (2 réponses) => trous dans la courbe.
insert into public.moods (team_id, score, tags, mood_date)
select
  e.team_id,
  greatest(1, least(5, round(
    case
      when g.j <= 7  then 2.6                -- dernière semaine : rechute
      when g.j <= 19 then 3.7                -- après l'action de J-20 : mieux
      when g.j <= 30 then 2.9                -- avant l'action : charge élevée
      else 3.6                               -- période précédente (J-60 à J-31)
    end + (random() * 1.6 - 0.8))::int)),
  case floor(random() * 6)::int
    when 0 then array['Charge de travail']
    when 1 then array['Ambiance d''équipe']
    when 2 then array['Reconnaissance']
    when 3 then array['Charge de travail', 'Équilibre pro/perso']
    when 4 then case when g.j > 30 then array['Management'] else array['Charge de travail'] end
    else '{}'::text[]
  end,
  current_date - g.j
from generate_series(1, 60) as g(j)
cross join lateral (
  select p.team_id, row_number() over (order by p.id) as rang
  from public.profiles p
  where p.role = 'employee' and p.team_id = (select id from public.teams where name = 'Équipe Produit')
) e
where not (g.j % 7 in (5, 6) and e.rang > 2);   -- jours creux : 2 réponses seulement (< 3 => masqué)

-- 3. Actions de démo, avec statut et échéance (dates choisies pour les repères 📣 du graphe)
insert into public.team_actions (team_id, message, tag, created_at, status, due_date, done_at)
select t.id, v.message, v.tag, now() - v.il_y_a, v.status, current_date + v.echeance, case when v.status = 'faite' then now() - v.il_y_a + interval '5 days' end
from public.teams t
cross join (values
  ('Suite à vos retours sur la charge, la livraison du module Export est décalée d''une semaine.', 'Charge de travail', interval '20 days', 'faite', -13),
  ('Point priorités en équipe chaque lundi à 9 h 30 pendant un mois.', 'Charge de travail', interval '9 days', 'en_cours', 12),
  ('Merci pour le sprint ! Petit-déjeuner d''équipe vendredi à 9 h 🥐', 'Reconnaissance', interval '3 days', 'prevue', 4)
) as v(message, tag, il_y_a, status, echeance)
where t.name = 'Équipe Produit';

-- 4. Réactions anonymes (+ registre des votants, sans la valeur) sur l'action de J-20
with a as (
  select id from public.team_actions
  where team_id = (select id from public.teams where name = 'Équipe Produit') and status = 'faite'
  limit 1
), votants as (
  select p.id as user_id, row_number() over (order by p.id) as rang
  from public.profiles p
  where p.role = 'employee' and p.team_id = (select id from public.teams where name = 'Équipe Produit')
  limit 4
), v as (
  insert into public.action_voters (action_id, user_id)
  select a.id, votants.user_id from a, votants
  returning action_id
)
insert into public.action_reactions (action_id, reaction)
select v.action_id, case when row_number() over () = 1 then 'insuffisant' else 'utile' end from v;

-- 5. Questionnaires anonymes (journées closes) pour les tendances
insert into public.reports (team_id, answers, report_date)
select t.id, v.answers, current_date - v.j
from public.teams t
cross join (values
  (array['charge', 'plus_semaine', 'beaucoup', 'manager', 'moins_charge'], 2),
  (array['charge', 'quelques_jours', 'un_peu', 'non', 'moins_charge'], 3),
  (array['management', 'plus_mois', 'beaucoup', 'rh', 'soutien'], 5),
  (array['charge', 'quelques_jours', 'beaucoup', 'non', 'souplesse'], 6)
) as v(answers, j)
where t.name = 'Équipe Produit';
