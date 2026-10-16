import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { DayStat } from './types'

/** Enregistre l'humeur du jour (anonyme : aucun lien avec l'utilisateur n'est stocké). */
export async function submitMood(score: number, tags: string[]): Promise<void> {
  const { error } = await supabase.rpc('submit_mood', { p_score: score, p_tags: tags })
  if (error) throw toFriendlyError(error.message)
}

/** Statistiques agrégées des 30 derniers jours de l'équipe du manager connecté. */
export async function getTeamStats(): Promise<DayStat[]> {
  const { data, error } = await supabase.rpc('team_stats')
  if (error) throw toFriendlyError(error.message)
  return (data ?? []).map((d: DayStat) => ({
    ...d,
    moyenne: d.moyenne === null ? null : Number(d.moyenne),
  }))
}
