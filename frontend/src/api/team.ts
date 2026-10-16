import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { TeamPulse } from './types'

/** Météo d'équipe : hier (moyenne si >= 3 réponses) et aujourd'hui (nombre de réponses seulement). */
export async function getTeamPulse(): Promise<TeamPulse> {
  const { data, error } = await supabase.rpc('team_pulse')
  if (error) throw toFriendlyError(error.message)
  const row = (data as TeamPulse[] | null)?.[0]
  if (!row) throw toFriendlyError('team_pulse vide')
  return {
    ...row,
    // Postgres renvoie un numeric sous forme de chaîne
    hier_moyenne: row.hier_moyenne === null ? null : Number(row.hier_moyenne),
  }
}
