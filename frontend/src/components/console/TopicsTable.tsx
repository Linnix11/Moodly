import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { TopicStat } from '../../api/types'
import { isTag, type Tag } from '../../lib/constants'
import { formatPercent } from '../../lib/stats'

/**
 * Évolution d'un sujet en points de part des réponses (A4).
 * — : pas d'historique exploitable ; « Nouveau » : historique, mais sujet absent. Hausse = problème qui grandit (rouge).
 */
function Evolution({ t }: { t: TopicStat }) {
  if (t.total_precedent === 0) return <span className="text-gray-400" title="Pas d'historique sur la période précédente">—</span>
  if (t.nb_precedent === 0) return <span className="text-xs font-semibold text-amber-700">Nouveau</span>
  const pts = Math.round((t.nb / Math.max(1, t.total_reponses) - t.nb_precedent / t.total_precedent) * 100)
  if (pts === 0) {
    return <span className="inline-flex items-center gap-1 text-gray-500"><Minus size={14} aria-hidden="true" /> stable</span>
  }
  const up = pts > 0
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${up ? 'text-red-600' : 'text-emerald-600'}`}>
      {up ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
      {up ? '+' : '−'}{Math.abs(pts)} pts
    </span>
  )
}

interface Props {
  topics: TopicStat[]
  limit?: number
  /** Version étroite (carte latérale) : sans la colonne « période précédente » */
  compact?: boolean
  /** Si fourni (manager) : bouton pour publier une action sur ce sujet */
  onPublish?: (tag: string) => void
  /** Si fourni : lien « Comment agir ? » vers la fiche conseil du sujet */
  onGuide?: (tag: Tag) => void
}

/** Tableau des sujets cités sur la période (pas de graphe : un seul graphe dans l'app). */
export function TopicsTable({ topics, limit, compact = false, onPublish, onGuide }: Props) {
  const rows = topics.filter((t) => t.nb > 0).slice(0, limit)
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">Aucun sujet cité sur la période (ou pas assez de réponses pour l'afficher).</p>
  }
  const noHistory = rows.every((t) => t.total_precedent === 0)
  return (
    <div className="overflow-x-auto">
      {noHistory && !compact && <p className="mb-2 text-xs text-gray-500">Pas d'historique sur la période précédente : l'évolution n'est pas encore calculable.</p>}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs text-gray-500">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">Sujet</th>
            {!compact && <th scope="col" className="py-2 pr-4 text-right font-medium">Mentions</th>}
            <th scope="col" className="py-2 pr-4 text-right font-medium">{compact ? 'Part' : 'Part des réponses'}</th>
            {!compact && <th scope="col" className="py-2 pr-4 text-right font-medium">Période précédente</th>}
            <th scope="col" className="py-2 pr-4 font-medium">Évolution</th>
            {onPublish && <th scope="col" className="py-2 font-medium"><span className="sr-only">Action</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((t) => (
            <tr key={t.tag}>
              <th scope="row" className="py-2.5 pr-4 font-medium text-gray-900">
                {t.tag}
                {onGuide && isTag(t.tag) && (
                  <button type="button" onClick={() => onGuide(t.tag as Tag)} className="ml-2 text-xs font-semibold text-brand-700 underline">
                    Comment agir ?
                  </button>
                )}
              </th>
              {!compact && <td className="py-2.5 pr-4 text-right tabular-nums">{t.nb}</td>}
              <td className="py-2.5 pr-4 text-right tabular-nums">{t.total_reponses > 0 ? formatPercent(t.nb / t.total_reponses) : '–'}</td>
              {!compact && <td className="py-2.5 pr-4 text-right tabular-nums text-gray-500">{t.nb_precedent}</td>}
              <td className="py-2.5 whitespace-nowrap"><Evolution t={t} /></td>
              {onPublish && (
                <td className="py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onPublish(t.tag)}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
                  >
                    Publier une action
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
