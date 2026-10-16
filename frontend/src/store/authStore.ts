import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import type { Profile } from '../api/types'
import { LEGAL_VERSION } from '../lib/legal'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<Profile>
  signOut: () => Promise<void>
  acceptTerms: () => Promise<void>
  markMoodDoneToday: () => void
}

const PROFILE_COLUMNS = 'id, full_name, role, team_id, last_mood_date'

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`${PROFILE_COLUMNS}, terms_version`)
    .eq('id', userId)
    .single()
  if (!error && data) return data as Profile
  // 42703 = colonne inconnue : migration « legal » pas encore passée, on n'exige pas l'acceptation
  if (error?.code === '42703') {
    const fallback = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).single()
    if (!fallback.error && fallback.data) return fallback.data as Profile
  }
  throw new Error('Profil introuvable')
}

/** Vrai si le compte doit (re)accepter les CGU avant d'utiliser l'app. */
export function needsTermsAcceptance(profile: Profile): boolean {
  return profile.terms_version !== undefined && profile.terms_version !== LEGAL_VERSION
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,

  /** Appelé au démarrage : restaure la session enregistrée sur l'appareil. */
  init: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      try {
        const profile = await fetchProfile(data.session.user.id)
        set({ session: data.session, profile })
      } catch {
        await supabase.auth.signOut()
      }
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) set({ session: null, profile: null })
      else set({ session })
    })
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) throw new Error('Email ou mot de passe incorrect.')
    let profile: Profile
    try {
      profile = await fetchProfile(data.session.user.id)
    } catch (err) {
      // Pas de session sans profil : l'app ne saurait pas où rediriger
      await supabase.auth.signOut()
      throw err
    }
    set({ session: data.session, profile })
    return profile
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },

  acceptTerms: async () => {
    const { error } = await supabase.rpc('accept_terms', { p_version: LEGAL_VERSION })
    if (error) throw new Error("Impossible d'enregistrer ton acceptation. Réessaie.")
    set((s) => (s.profile ? { profile: { ...s.profile, terms_version: LEGAL_VERSION } } : s))
  },

  markMoodDoneToday: () =>
    set((s) => (s.profile ? { profile: { ...s.profile, last_mood_date: todayISO() } } : s)),
}))

/** Date du jour au format YYYY-MM-DD (en UTC, comme current_date côté Supabase). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
