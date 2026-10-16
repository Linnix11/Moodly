import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { Benchmark, ConsoleScope, DayStat, ReportSummaryRow, Team, TeamOverviewRow, TopicStat, UserRow } from './types'

// Toutes ces fonctions SQL vérifient le rôle (manager : son équipe ; RH : toutes).
// teamId null = son équipe (manager) ou toute l'entreprise (RH).

const num = (v: number | string | null) => (v === null ? null : Number(v))

export async function getScope(teamId: number | null = null): Promise<ConsoleScope> {
  const { data, error } = await supabase.rpc('console_scope', { p_team_id: teamId })
  if (error) throw toFriendlyError(error.message)
  const row = (data as ConsoleScope[] | null)?.[0]
  if (!row) throw toFriendlyError('console_scope vide')
  return row
}

export async function getStatsRange(days: number, teamId: number | null = null): Promise<DayStat[]> {
  const { data, error } = await supabase.rpc('console_stats', { p_days: days, p_team_id: teamId })
  if (error) throw toFriendlyError(error.message)
  return ((data ?? []) as DayStat[]).map((d) => ({ ...d, moyenne: num(d.moyenne) }))
}

export async function getTopics(days: number, teamId: number | null = null): Promise<TopicStat[]> {
  const { data, error } = await supabase.rpc('console_topics', { p_days: days, p_team_id: teamId })
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

export async function getReportSummaryRange(days: number, teamId: number | null = null): Promise<ReportSummaryRow[]> {
  const { data, error } = await supabase.rpc('console_report_summary', { p_days: days, p_team_id: teamId })
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

/** Commentaires libres des questionnaires (période au choix) : sans date, ordre aléatoire, vide sous 3. */
export async function getReportCommentsRange(days: number, teamId: number | null = null): Promise<string[]> {
  const { data, error } = await supabase.rpc('console_report_comments', { p_days: days, p_team_id: teamId })
  if (error) throw toFriendlyError(error.message)
  return ((data ?? []) as { commentaire: string }[]).map((r) => r.commentaire)
}

export async function getCompanyOverview(): Promise<TeamOverviewRow[]> {
  const { data, error } = await supabase.rpc('company_overview')
  if (error) throw toFriendlyError(error.message)
  return ((data ?? []) as TeamOverviewRow[]).map((r) => ({ ...r, moyenne_7j: num(r.moyenne_7j), moyenne_prec: num(r.moyenne_prec) }))
}

/** Moyenne de l'équipe vs moyenne de l'entreprise (masquée sous 2 équipes). */
export async function getBenchmark(days: number, teamId: number | null = null): Promise<Benchmark | null> {
  const { data, error } = await supabase.rpc('company_benchmark', { p_days: days, p_team_id: teamId })
  if (error) throw toFriendlyError(error.message)
  const row = (data as Benchmark[] | null)?.[0]
  return row ? { ...row, moyenne_equipe: num(row.moyenne_equipe), moyenne_entreprise: num(row.moyenne_entreprise) } : null
}

// ---- Gestion RH ----

export async function listUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase.rpc('rh_list_users')
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

/**
 * Crée un compte déjà confirmé, avec son rôle et son équipe.
 * Passe par l'Edge Function rh-create-user : la clé secrète ne quitte jamais le serveur.
 */
export async function createUser(input: { email: string; password: string; fullName: string; role: string; teamId: number | null }): Promise<string> {
  const { data, error } = await supabase.functions.invoke('rh-create-user', {
    body: { email: input.email, password: input.password, full_name: input.fullName, role: input.role, team_id: input.teamId },
  })
  if (error) {
    // La fonction renvoie { error: "message lisible" } avec un statut 4xx/5xx
    if (error instanceof FunctionsHttpError) {
      const body = await (error.context as Response).json().catch(() => null)
      if (body?.error) throw new Error(body.error)
    }
    throw new Error("Création impossible : vérifie que la fonction « rh-create-user » est déployée dans Supabase.")
  }
  return (data as { user_id: string }).user_id
}

export async function setUser(userId: string, role: string, teamId: number | null): Promise<void> {
  const { error } = await supabase.rpc('rh_set_user', { p_user: userId, p_role: role, p_team_id: teamId })
  if (error) throw toFriendlyError(error.message)
}

/** Liste des équipes (la RH les voit toutes grâce à la RLS). */
export async function listTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('id, name, manager_id').order('name')
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

/** Crée (id null) ou modifie une équipe. Renvoie son id. */
export async function saveTeam(id: number | null, name: string, managerId: string | null): Promise<number> {
  const { data, error } = await supabase.rpc('rh_save_team', { p_id: id, p_name: name, p_manager: managerId })
  if (error) throw toFriendlyError(error.message)
  return data as number
}

export async function deleteTeam(id: number): Promise<void> {
  const { error } = await supabase.rpc('rh_delete_team', { p_id: id })
  if (error) throw toFriendlyError(error.message)
}
