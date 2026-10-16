-- =====================================================================
--  WORKZEN : acceptation des CGU et de la politique de confidentialité
--  À exécuter APRÈS 20261017000000_v3.sql (SQL Editor > Run)
--  On garde la version acceptée et la date (preuve d'acceptation, RGPD art. 7).
--  Changer la version côté front (LEGAL_VERSION) redemande l'acceptation à tous.
-- =====================================================================

alter table public.profiles
  add column if not exists terms_version     text,
  add column if not exists terms_accepted_at timestamptz;

-- Le client ne peut pas écrire dans profiles directement (pas de policy update) :
-- il passe par cette fonction, qui ne touche qu'à son propre profil.
create or replace function public.accept_terms(p_version text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if p_version is null or p_version !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Version invalide';
  end if;
  update public.profiles
  set terms_version = p_version, terms_accepted_at = now()
  where id = auth.uid();
end;
$$;

revoke execute on function public.accept_terms(text) from public, anon;
grant  execute on function public.accept_terms(text) to authenticated;
