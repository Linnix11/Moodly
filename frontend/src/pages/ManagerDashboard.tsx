import { AlertTriangle, ClipboardList, Plus, RefreshCw, TrendingDown, TrendingUp, Minus, CircleCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteAction, getActionFeedback, getActionImpact, getActions, setActionStatus } from '../api/actions'
import { getBenchmark } from '../api/console'
import { getTeamStats } from '../api/moods'
import type { ActionFeedback, ActionImpact, ActionStatus, Benchmark, DayStat, TeamAction } from '../api/types'
import { ActionList, ActionStatusSummary } from '../components/ActionList'
import { AppHeader } from '../components/AppHeader'
import { GuideSheet } from '../components/GuideSheet'
import { MoodChart } from '../components/MoodChart'
import { PublishActionSheet } from '../components/PublishActionSheet'
import { Screen } from '../components/Screen'
import { ACTION_SUGGESTIONS, ANONYMITY_THRESHOLD, isTag, type Tag } from '../lib/constants'
import { formatDecimal } from '../lib/date'
import { alertMessage, summarize } from '../lib/stats'

/** Contenu prérempli du panneau de publication (null = fermé). */
interface SheetState {
  message: string
  tag: string | null
}

/** Actions + avis anonymes + évolution du moral depuis chaque action (masquée si équipe trop petite). */
const fetchActionData = () =>
  Promise.all([
    getActions(5),
    getActionFeedback(),
    getActionImpact().catch(() => new Map<number, ActionImpact>()),
  ])

/** Vue manager : 3 indicateurs + UN SEUL graphe (moral moyen sur 30 jours). */
export default function ManagerDashboard() {
  const [stats, setStats] = useState<DayStat[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<TeamAction[] | null>(null)
  const [actionsError, setActionsError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Map<number, ActionFeedback>>(new Map())
  const [impact, setImpact] = useState<Map<number, ActionImpact>>(new Map())
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null)
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [guide, setGuide] = useState<Tag | null>(null)

  const applyActions = useCallback(([a, f, i]: Awaited<ReturnType<typeof fetchActionData>>) => {
    setActions(a)
    setFeedback(f)
    setImpact(i)
  }, [])

  const loadActions = useCallback(async () => {
    setActionsError(null)
    try {
      applyActions(await fetchActionData())
    } catch (err) {
      setActionsError((err as Error).message)
    }
  }, [applyActions])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    void loadActions()
    try {
      setStats(await getTeamStats())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [loadActions])

  // Premier chargement (le bouton « Actualiser » utilise load())
  useEffect(() => {
    getTeamStats()
      .then(setStats, (err: Error) => setError(err.message))
      .finally(() => setLoading(false))
    fetchActionData().then(applyActions, (err: Error) => setActionsError(err.message))
    getBenchmark(30).then(setBenchmark, () => setBenchmark(null))
  }, [applyActions])

  const summary = useMemo(() => (stats ? summarize(stats) : null), [stats])
  const alert = summary ? alertMessage(summary) : null
  const suggestionTag = isTag(summary?.topTag) ? summary.topTag : null

  const onStatusChange = async (id: number, status: ActionStatus, dueDate: string | null) => {
    await setActionStatus(id, status, dueDate)
    await loadActions()
  }

  const onDelete = async (id: number) => {
    await deleteAction(id)
    setActions((prev) => prev?.filter((a) => a.id !== id) ?? null)
  }

  return (
    <Screen>
      <AppHeader subtitle="Vue manager" />

      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">Moral de l'équipe</h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Actualiser"
          title="Actualiser"
          className="-mr-2 rounded-lg p-2.5 text-gray-500 hover:bg-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="mt-1 text-sm text-gray-500">30 derniers jours, jusqu'à hier. La journée en cours reste masquée pour protéger l'anonymat.</p>
      <Link
        to="/manager/rapports"
        className="mt-3 inline-flex items-center gap-1.5 self-start rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <ClipboardList size={16} aria-hidden="true" className="text-brand-700" /> Rapports et demandes
      </Link>

      {error && (
        <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button type="button" onClick={load} className="ml-2 font-semibold underline">Réessayer</button>
        </div>
      )}

      {!stats && loading && <div className="mt-6 h-96 animate-pulse rounded-2xl bg-gray-100" />}

      {stats && summary && (
        <>
          {summary.responses === 0 ? (
            <div className="mt-6 rounded-2xl bg-white p-6 text-center">
              <p className="text-4xl">🌱</p>
              <p className="mt-3 font-semibold text-gray-900">Pas encore de réponses</p>
              <p className="mt-1 text-sm text-gray-500">
                Encouragez l'équipe à répondre chaque jour : la courbe apparaît dès {ANONYMITY_THRESHOLD} réponses dans une journée.
              </p>
            </div>
          ) : (
            <>
              <dl className="mt-6 grid grid-cols-3 overflow-hidden rounded-2xl bg-white">
                <div className="-ml-px min-w-0 border-l border-gray-200 p-3">
                  <dt className="text-xs text-gray-500">Moyenne 30 j</dt>
                  <dd className="mt-1 font-display text-3xl font-medium tabular-nums text-gray-900">
                    {summary.avg30 != null ? formatDecimal(summary.avg30) : '–'}<span className="font-sans text-sm font-normal text-gray-500">/5</span>
                  </dd>
                </div>
                <div className="-ml-px min-w-0 border-l border-gray-200 p-3">
                  <dt className="text-xs text-gray-500">7 derniers j</dt>
                  <dd className={`mt-1 flex items-center gap-1 font-display text-3xl font-medium tabular-nums ${
                    summary.trend === null ? 'text-gray-900' : summary.trend < -0.2 ? 'text-red-600' : summary.trend > 0.2 ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {summary.last7 != null ? formatDecimal(summary.last7) : '–'}
                    {summary.trend !== null && (summary.trend < -0.2 ? <TrendingDown size={18} /> : summary.trend > 0.2 ? <TrendingUp size={18} /> : <Minus size={18} />)}
                  </dd>
                </div>
                <div className="-ml-px min-w-0 border-l border-gray-200 p-3">
                  <dt className="text-xs text-gray-500">Sujet n°1</dt>
                  <dd className="mt-1 text-sm leading-tight font-semibold text-gray-900">{summary.topTag ?? '–'}</dd>
                </div>
              </dl>

              {alert ? (
                <section aria-labelledby="alert-title" className="relative mt-4 overflow-hidden rounded-2xl bg-white p-4 pl-5">
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-amber-400" />
                  <h2 id="alert-title" className="flex items-center gap-2 font-semibold text-gray-900">
                    <AlertTriangle size={18} aria-hidden="true" className="text-amber-600" /> À surveiller
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">{alert}</p>
                  {suggestionTag && (
                    <button type="button" onClick={() => setGuide(suggestionTag)} className="mt-2 text-sm font-semibold text-brand-700 hover:underline">
                      Comment agir ? →
                    </button>
                  )}
                  <h3 className="mt-4 text-xs font-medium text-gray-500">Pistes d'action</h3>
                  <ul className="mt-2 space-y-2">
                    {ACTION_SUGGESTIONS[suggestionTag ?? 'default'].map((s) => (
                      <li key={s} className="flex items-center gap-3 rounded-lg bg-wz-pale px-3 py-2.5">
                        <span className="flex-1 text-sm text-gray-900">{s}</span>
                        <button
                          type="button"
                          onClick={() => setSheet({ message: s, tag: suggestionTag })}
                          className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
                        >
                          Publier
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-gray-700"><CircleCheck size={18} aria-hidden="true" className="text-emerald-600" /> Rien d'alarmant cette semaine.</p>
              )}

              <section className="mt-4 rounded-2xl bg-white p-4">
                <MoodChart data={stats} markers={(actions ?? []).map((a) => ({ date: a.created_at.slice(0, 10), message: a.message }))} />
                <p className="mt-2 text-xs text-gray-400">
                  Les trous dans la courbe = jours avec moins de {ANONYMITY_THRESHOLD} réponses, masqués pour protéger l'anonymat.
                </p>
              </section>

              {benchmark?.moyenne_equipe != null && benchmark.moyenne_entreprise != null && (
                <p className="mt-4 text-center text-sm text-gray-700">
                  Votre équipe <strong>{formatDecimal(benchmark.moyenne_equipe)}</strong> · Entreprise <strong>{formatDecimal(benchmark.moyenne_entreprise)}</strong>
                </p>
              )}
              <p className="mt-2 text-center text-xs text-gray-400">{summary.responses} réponses anonymes sur la période</p>
            </>
          )}
        </>
      )}

      <section aria-labelledby="actions-title" className="mt-8">
        <h2 id="actions-title" className="mb-3 text-lg font-semibold text-gray-900">Actions partagées avec l'équipe</h2>
        <button
          type="button"
          onClick={() => setSheet({ message: '', tag: null })}
          className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 active:translate-y-px py-3 font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <Plus size={18} aria-hidden="true" /> Publier une action
        </button>
        {actionsError && (
          <div role="alert" className="mb-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {actionsError}
            <button type="button" onClick={loadActions} className="ml-2 font-semibold underline">Réessayer</button>
          </div>
        )}
        {actions === null && !actionsError && <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />}
        {actions?.length === 0 && (
          <p className="rounded-2xl bg-white p-4 text-sm text-gray-500">
            Aucune action publiée pour l'instant. Montrez à l'équipe que ses retours comptent.
          </p>
        )}
        {actions && actions.length > 0 && (
          <>
            <div className="mb-3"><ActionStatusSummary actions={actions} /></div>
            <ActionList actions={actions} mode="manager" feedback={feedback} impact={impact} onStatusChange={onStatusChange} onDelete={onDelete} />
          </>
        )}
      </section>

      {sheet && (
        <PublishActionSheet
          initialMessage={sheet.message}
          initialTag={sheet.tag}
          onClose={() => setSheet(null)}
          onPublished={() => {
            setSheet(null)
            void loadActions()
          }}
        />
      )}
      {guide && <GuideSheet tag={guide} onClose={() => setGuide(null)} />}
    </Screen>
  )
}
