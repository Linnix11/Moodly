import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { ReportSummaryRow } from './types'

/** Envoie le questionnaire : 100 % anonyme (ni nom, ni note, ni lien avec l'humeur). Le commentaire est facultatif. */
export async function submitReport(answers: string[], comment?: string | null): Promise<void> {
  const { error } = await supabase.rpc('submit_report', { p_answers: answers, p_comment: comment?.trim() || null })
  if (error) throw toFriendlyError(error.message)
}

/** Réponses des questionnaires anonymes, agrégées (journées closes, vide sous 3). */
export async function getReportSummary(): Promise<ReportSummaryRow[]> {
  const { data, error } = await supabase.rpc('team_report_summary')
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

/** Commentaires libres de l'équipe (30 j, journées closes) : sans date, ordre aléatoire, vide sous 3. */
export async function getReportComments(): Promise<string[]> {
  const { data, error } = await supabase.rpc('team_report_comments')
  if (error) throw toFriendlyError(error.message)
  return ((data ?? []) as { commentaire: string }[]).map((r) => r.commentaire)
}
