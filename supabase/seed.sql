-- =====================================================================
--  WORKZEN (projet MOODLY) : mise en place de l'équipe de démo
--  À lancer APRÈS les migrations et APRÈS avoir créé les comptes dans
--  Authentication > Users > Add user (avec « Auto confirm user ») :
--    - manager@workzen.dev           (le manager de démo)
--    - au moins 5 employés @workzen.dev (ex. lea@, antoine@, sarah@, tom@, ines@)
--    - rh@workzen.dev                (facultatif : le compte RH de démo)
--  Puis lancer reset_demo.sql pour générer les données (humeurs, actions…).
-- =====================================================================

-- 0. L'ancienne équipe de démo « RH » devient « Équipe Produit »
--    (pour ne pas la confondre avec la vue entreprise RH)
update public.teams set name = 'Équipe Produit'
where name = 'RH' and not exists (select 1 from public.teams where name = 'Équipe Produit');

-- 1. L'équipe de démo, gérée par le manager de démo
insert into public.teams (name, manager_id)
select 'Équipe Produit', id from auth.users where email = 'manager@workzen.dev'
  and not exists (select 1 from public.teams where name = 'Équipe Produit');
update public.teams set manager_id = (select id from auth.users where email = 'manager@workzen.dev')
where name = 'Équipe Produit';

-- 2. Profils manquants (comptes créés avant la migration), rôle manager
insert into public.profiles (id)
select id from auth.users where email like '%@workzen.dev'
on conflict (id) do nothing;

update public.profiles set role = 'manager'
where id = (select id from auth.users where email = 'manager@workzen.dev');

-- 3. Compte RH de démo : rôle RH, sans équipe (accès à la console RH /console)
update public.profiles set role = 'rh', team_id = null
where id = (select id from auth.users where email = 'rh@workzen.dev');

-- 4. Employés et manager rattachés à l'équipe de démo (la RH n'a pas d'équipe)
update public.profiles
set team_id = (select id from public.teams where name = 'Équipe Produit')
where id in (select id from auth.users where email like '%@workzen.dev')
  and role in ('employee', 'manager');
