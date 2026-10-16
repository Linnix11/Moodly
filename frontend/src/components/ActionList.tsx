import { AlertTriangle, Pencil, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ActionFeedback, ActionImpact, ActionStatus, TeamAction } from '../api/types'
import { ACTION_STATUS } from '../lib/constants'
import { formatDecimal, formatRelative, localISO } from '../lib/date'
import { TagBadge } from './TagBadge'

type Mode = 'employee' | 'manager' | 'readonly'

interface Props {
  actions: TeamAction[]
  /** employee : statut + vote ; manager : statut modifiable + avis + évolution ; readonly (RH) : avis + évolution */
  mode?: Mode
  feedback?: Map<number, ActionFeedback>
  impact?: Map<number, ActionImpact>
  /** Employé : actions sur lesquelles il a déjà voté */
  votes?: Set<number>
  onVote?: (id: number, reaction: 'utile' | 'insuffisant') => Promise<void>
  onStatusChange?: (id: number, status: ActionStatus, dueDate: string | null) => Promise<void>
  onDelete?: (id: number) => Promise<void>
  onEdit?: (action: TeamAction) => void
}

const frDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Badge de statut + échéance (« En retard » si l'échéance est passée et l'action pas faite). */
export function StatusBadge({ action, lateOnly = false }: { action: TeamAction; lateOnly?: boolean }) {
  const s = ACTION_STATUS[action.status] ?? ACTION_STATUS.prevue
  const late = action.due_date !== null && action.status !== 'faite' && action.due_date < localISO()
  return (
    <>
      {!lateOnly && <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold ${s.badge}`}>{s.label}</span>}
      {!lateOnly && action.due_date && action.status !== 'faite' && (
        <span className="text-xs text-gray-500">Prévu pour le {frDay(action.due_date)}</span>
      )}
      {late && <span className="inline-block rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">En retard</span>}
    </>
  )
}

/** « 3 actions : 1 faite · 1 en cours · 1 prévue » */
export function ActionStatusSummary({ actions }: { actions: TeamAction[] }) {
  if (actions.length === 0) return null
  const count = (s: ActionStatus) => actions.filter((a) => a.status === s).length
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`
  return (
    <p className="text-sm text-gray-600">
      {plural(actions.length, 'action')} : {plural(count('faite'), 'faite')} · {count('en_cours')} en cours · {plural(count('prevue'), 'prévue')}
    </p>
  )
}

function FeedbackLine({ f }: { f?: ActionFeedback }) {
  if (!f || f.nb_votes === 0) return <p className="text-xs text-gray-500">Pas encore d'avis de l'équipe.</p>
  if (f.nb_utile === null || f.nb_insuffisant === null) {
    return <p className="text-xs text-gray-500">Moins de 3 avis : résultat masqué ({f.nb_votes} pour l'instant).</p>
  }
  return (
    <div className="text-xs">
      <p className="text-gray-700">👍 {f.nb_utile} · 👎 {f.nb_insuffisant} ({f.nb_votes} avis)</p>
      {f.nb_insuffisant > f.nb_utile && (
        <p className="mt-1 flex items-center gap-1 font-medium text-amber-800">
          <AlertTriangle size={12} aria-hidden="true" /> L'équipe juge cette action insuffisante.
        </p>
      )}
    </div>
  )
}

type ImpactLike = Pick<ActionImpact, 'delta' | 'moyenne_avant' | 'moyenne_apres'>

/** « Évolution depuis l'action » : jamais « grâce à » (corrélation, pas causalité). */
function ImpactLine({ action, i }: { action: TeamAction; i?: ImpactLike }) {
  if (i && i.delta !== null && i.moyenne_avant !== null && i.moyenne_apres !== null) {
    const sign = i.delta > 0 ? '+' : i.delta < 0 ? '−' : '±'
    return (
      <p className="text-xs text-gray-700">
        Évolution depuis l'action : moral <strong>{sign}{formatDecimal(Math.abs(i.delta))}</strong> ({formatDecimal(i.moyenne_avant)} → {formatDecimal(i.moyenne_apres)})
      </p>
    )
  }
  const daysSince = Math.floor((Date.parse(localISO()) - Date.parse(action.created_at.slice(0, 10))) / 86_400_000)
  return (
    <p className="text-xs text-gray-500">
      {daysSince <= 7 ? 'Pas encore assez de recul (7 jours nécessaires).' : "Pas assez de réponses pour mesurer l'évolution."}
    </p>
  )
}

/** Liste des actions publiées par le manager. */
export function ActionList({ actions, mode = 'readonly', feedback, impact, votes, onVote, onStatusChange, onDelete, onEdit }: Props) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Exécute une opération sur une ligne en affichant l'erreur éventuelle. */
  const run = async (id: number, op: () => Promise<void>) => {
    setBusyId(id)
    setError(null)
    try {
      await op()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ul className="space-y-3">
        {actions.map((a) => (
          <li key={a.id} className="rounded-2xl bg-white p-4">
            <div className="flex items-start gap-3">
              <p className="flex-1 text-sm text-gray-900">{a.message}</p>
              {onEdit && confirmingId !== a.id && (
                <button
                  type="button"
                  onClick={() => onEdit(a)}
                  aria-label="Modifier cette action"
                  title="Modifier"
                  className="-m-1.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  <Pencil size={18} />
                </button>
              )}
              {onDelete && confirmingId !== a.id && (
                <button
                  type="button"
                  onClick={() => setConfirmingId(a.id)}
                  aria-label="Supprimer cette action"
                  title="Supprimer"
                  className="-m-1.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {a.tag && <TagBadge tag={a.tag} />}
              <time dateTime={a.created_at}>{formatRelative(a.created_at)}</time>
              {mode !== 'manager' && <StatusBadge action={a} />}
            </div>

            {mode === 'manager' && onStatusChange && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label htmlFor={`status-${a.id}`} className="sr-only">Statut de l'action</label>
                <select
                  id={`status-${a.id}`}
                  value={a.status}
                  disabled={busyId === a.id}
                  onChange={(e) => run(a.id, () => onStatusChange(a.id, e.target.value as ActionStatus, a.due_date))}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
                >
                  {(Object.keys(ACTION_STATUS) as ActionStatus[]).map((s) => <option key={s} value={s}>{ACTION_STATUS[s].label}</option>)}
                </select>
                <label htmlFor={`due-${a.id}`} className="text-xs text-gray-500">Échéance</label>
                <input
                  id={`due-${a.id}`}
                  type="date"
                  value={a.due_date ?? ''}
                  disabled={busyId === a.id}
                  onChange={(e) => run(a.id, () => onStatusChange(a.id, a.status, e.target.value || null))}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
                />
                <StatusBadge action={a} lateOnly />
              </div>
            )}

            {(mode === 'manager' || mode === 'readonly') && (feedback || impact) && (
              <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                {feedback && <FeedbackLine f={feedback.get(a.id)} />}
                {impact && <ImpactLine action={a} i={impact.get(a.id)} />}
              </div>
            )}

            {mode === 'employee' && onVote && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                {votes?.has(a.id) ? (
                  <p role="status" className="text-sm text-emerald-700">Merci, ton avis est anonyme ✓</p>
                ) : (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Ton avis sur cette action">
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => run(a.id, () => onVote(a.id, 'utile'))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm text-gray-700 ring-1 ring-gray-200 hover:bg-brand-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600"
                    >
                      <ThumbsUp size={14} aria-hidden="true" /> Ça m'aide
                    </button>
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => run(a.id, () => onVote(a.id, 'insuffisant'))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm text-gray-700 ring-1 ring-gray-200 hover:bg-brand-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600"
                    >
                      <ThumbsDown size={14} aria-hidden="true" /> Pas suffisant
                    </button>
                  </div>
                )}
              </div>
            )}

            {confirmingId === a.id && (
              <div role="group" aria-label="Confirmer la suppression" className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm">
                <span className="flex-1 text-red-800">Supprimer cette action ?</span>
                <button
                  type="button"
                  onClick={() => onDelete && run(a.id, async () => { await onDelete(a.id); setConfirmingId(null) })}
                  disabled={busyId === a.id}
                  className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  {busyId === a.id ? 'Suppression…' : 'Oui'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  disabled={busyId === a.id}
                  className="rounded-lg px-3 py-1.5 font-medium text-gray-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  Annuler
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
