import type { DayStat, ReportSummaryRow, TeamOverviewRow } from '../api/types'
import { formatDecimal } from './date'

/** Moyenne pondérée par le nombre de réponses, sur les jours visibles uniquement. */
export function weightedAverage(days: DayStat[]): number | null {
  const visible = days.filter((d) => d.moyenne !== null)
  const total = visible.reduce((s, d) => s + d.nb_reponses, 0)
  if (total === 0) return null
  return visible.reduce((s, d) => s + (d.moyenne as number) * d.nb_reponses, 0) / total
}

/** Calcule les 3 indicateurs texte affichés au-dessus du graphe. */
export function summarize(stats: DayStat[]) {
  const avg30 = weightedAverage(stats)
  const last7 = weightedAverage(stats.slice(-7))
  const prev7 = weightedAverage(stats.slice(-14, -7))
  const trend = last7 !== null && prev7 !== null ? last7 - prev7 : null

  const tagCount = new Map<string, number>()
  stats.slice(-7).forEach((d) => d.top_tags.forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1)))
  const topTag = [...tagCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const responses = stats.reduce((s, d) => s + d.nb_reponses, 0)
  return { avg30, last7, trend, topTag, responses }
}

/** Texte de la bannière « À surveiller », ou null si rien d'alarmant (baisse >= 0,3 ou moyenne 7 j < 2,75). */
export function alertMessage({ last7, trend, topTag }: ReturnType<typeof summarize>): string | null {
  const dropping = trend !== null && trend <= -0.3
  const low = last7 !== null && last7 < 2.75
  if (!dropping && !low) return null
  const head = dropping
    ? `Le moral baisse : −${formatDecimal(Math.abs(trend))} point${Math.abs(trend) >= 2 ? 's' : ''} en 7 jours.`
    : `Le moral est bas : ${formatDecimal(last7 as number)} / 5 sur les 7 derniers jours.`
  return topTag ? `${head} Sujet n°1 : ${topTag}.` : head
}

/**
 * Participation : moyenne, sur les journées closes, de « réponses du jour / employés de l'équipe »,
 * chaque jour plafonné à 100 %. Plus de réponses que de membres = données de démo incohérentes (signalé en dev).
 */
export function participationRate(stats: DayStat[], members: number): number | null {
  if (members <= 0 || stats.length === 0) return null
  const incoherent = stats.filter((d) => d.nb_reponses > members)
  if (incoherent.length > 0 && import.meta.env.DEV) {
    console.warn(`[WorkZen] ${incoherent.length} jour(s) avec plus de réponses que de membres (${members}) : vérifier le seed de démo.`, incoherent.map((d) => d.jour))
  }
  return stats.reduce((s, d) => s + Math.min(1, d.nb_reponses / members), 0) / stats.length
}

/** Pourcentage arrondi en français : 0.426 -> « 43 % ». */
export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)} %`

/** Nombre total de rapports anonymes = somme des réponses à la question 1. */
export const anonymousTotal = (summary: ReportSummaryRow[]) =>
  summary.filter((r) => r.question === 1).reduce((s, r) => s + r.nb, 0)

/** Tendance d'une équipe dans la vue entreprise : moyenne 7 j - moyenne des 7 j d'avant. */
export const trendOf = (r: TeamOverviewRow) =>
  r.moyenne_7j !== null && r.moyenne_prec !== null ? r.moyenne_7j - r.moyenne_prec : null

/** Même règle que la bannière « À surveiller » : baisse >= 0,3 ou moyenne 7 j < 2,75. */
export function isWatched(r: TeamOverviewRow): boolean {
  const t = trendOf(r)
  return (t !== null && t <= -0.3) || (r.moyenne_7j !== null && r.moyenne_7j < 2.75)
}
