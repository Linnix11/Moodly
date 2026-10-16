import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { ActionFeedback, ActionImpact, ActionStatus, TeamAction } from './types'

/**
 * Dernières actions (la RLS limite la lecture : son équipe, ou toutes pour la RH).
 * teamId : filtre sur une équipe (utile à la RH) ; since : date ISO minimale.
 */
export async function getActions(limit = 10, teamId?: number | null, since?: string): Promise<TeamAction[]> {
  let query = supabase
    .from('team_actions')
    .select('id, message, tag, created_at, status, due_date, done_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (teamId != null) query = query.eq('team_id', teamId)
  if (since) query = query.gte('created_at', since)
  const { data, error } = await query
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

/** Publie une action pour l'équipe (manager uniquement, vérifié en SQL). Renvoie son id. */
export async function publishAction(message: string, tag?: string | null): Promise<number> {
  const { data, error } = await supabase.rpc('publish_action', { p_message: message, p_tag: tag ?? null })
  if (error) throw toFriendlyError(error.message)
  return data as number
}

export async function updateAction(id: number, message: string, tag?: string | null): Promise<void> {
  const { error } = await supabase.rpc('update_action', { p_id: id, p_message: message, p_tag: tag ?? null })
  if (error) throw toFriendlyError(error.message)
}

export async function deleteAction(id: number): Promise<void> {
  const { error } = await supabase.rpc('delete_action', { p_id: id })
  if (error) throw toFriendlyError(error.message)
}

/** Statut et échéance (manager de l'équipe uniquement, vérifié en SQL). */
export async function setActionStatus(id: number, status: ActionStatus, dueDate: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_action_status', { p_id: id, p_status: status, p_due_date: dueDate })
  if (error) throw toFriendlyError(error.message)
}

/** Vote anonyme d'un employé (une seule fois, non modifiable). */
export async function reactToAction(id: number, reaction: 'utile' | 'insuffisant'): Promise<void> {
  const { error } = await supabase.rpc('react_action', { p_action_id: id, p_reaction: reaction })
  if (error) throw toFriendlyError(error.message)
}

/** Actions sur lesquelles j'ai déjà voté (la RLS ne renvoie que mes lignes, sans la valeur du vote). */
export async function getMyVotes(): Promise<Set<number>> {
  const { data, error } = await supabase.from('action_voters').select('action_id')
  if (error) throw toFriendlyError(error.message)
  return new Set((data ?? []).map((r: { action_id: number }) => r.action_id))
}

/** Réactions agrégées (manager / RH) : détail masqué sous 3 votes. */
export async function getActionFeedback(teamId: number | null = null): Promise<Map<number, ActionFeedback>> {
  const { data, error } = await supabase.rpc('action_feedback', { p_team_id: teamId })
  if (error) throw toFriendlyError(error.message)
  return new Map(((data ?? []) as ActionFeedback[]).map((f) => [f.action_id, f]))
}

/** Moral 7 jours avant / après chaque action (manager / RH). */
export async function getActionImpact(teamId: number | null = null): Promise<Map<number, ActionImpact>> {
  const { data, error } = await supabase.rpc('action_impact', { p_team_id: teamId })
  if (error) throw toFriendlyError(error.message)
  const num = (v: number | string | null) => (v === null ? null : Number(v))
  return new Map(((data ?? []) as ActionImpact[]).map((i) => [i.action_id, {
    ...i, moyenne_avant: num(i.moyenne_avant), moyenne_apres: num(i.moyenne_apres), delta: num(i.delta),
  }]))
}
