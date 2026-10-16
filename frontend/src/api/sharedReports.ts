import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { MySharedReport, SharedPerson, SharedReport } from './types'

// Questionnaires que le salarié a choisi de partager AVEC son nom (question 4 : « en parler à mon manager / aux RH »).
// Manager : ceux adressés au manager de son équipe ; RH : ceux adressés aux RH (vérifié en SQL).

export async function listSharedPeople(): Promise<SharedPerson[]> {
  const { data, error } = await supabase.rpc('shared_report_people')
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

export async function getSharedHistory(userId: string): Promise<SharedReport[]> {
  const { data, error } = await supabase.rpc('shared_report_history', { p_user: userId })
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

export async function markSharedReportHandled(id: number): Promise<void> {
  const { error } = await supabase.rpc('mark_shared_report_handled', { p_id: id })
  if (error) throw toFriendlyError(error.message)
}

/** Ce que j'ai partagé avec mon nom (transparence pour le salarié). */
export async function getMySharedReports(): Promise<MySharedReport[]> {
  const { data, error } = await supabase.rpc('my_shared_reports')
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}
