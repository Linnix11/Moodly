import { AlertTriangle, BookOpen, CircleCheck, Download, Plus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { getActionFeedback, getActionImpact, getActions } from '../../api/actions'
import { getBenchmark, getReportSummaryRange, getScope, getStatsRange, getTopics } from '../../api/console'
import type { ActionImpact } from '../../api/types'
import { ACTION_SUGGESTIONS, ANONYMITY_THRESHOLD, isTag, type Tag } from '../../lib/constants'
import { downloadStatsCsv } from '../../lib/csv'
import { formatDecimal, localISO } from '../../lib/date'
import { alertMessage, formatPercent, participationRate, summarize } from '../../lib/stats'
import { useLoader } from '../../lib/useLoader'
import { Link } from 'react-router-dom'
import { ActionList, ActionStatusSummary } from '../ActionList'
import { GuideSheet } from '../GuideSheet'
import { MoodChart } from '../MoodChart'
import { PublishActionSheet } from '../PublishActionSheet'
import { AnonymousTrends } from '../ReportViews'
import { Card, ConsoleHeader, ErrorBox, KpiCard, PeriodPicker, RefreshButton } from './ConsoleUi'
import { secondaryButton } from './styles'
import { TopicsTable } from './TopicsTable'

interface Props {
  /** null = son équipe (manager) ou toute l'entreprise (RH) */
  teamId: number | null
  /** RH : consultation seule (pas de publication d'action) */
  readOnly?: boolean
}

/** Vue d'ensemble d'une équipe (ou de l'entreprise) : indicateurs, alerte, LE graphe, sujets. */
export function TeamOverview({ teamId, readOnly = false }: Props) {
  const [days, setDays] = useState(30)
  const [sheet, setSheet] = useState<{ message: string; tag: string | null } | null>(null)
  const [published, setPublished] = useState(false)
  const [guide, setGuide] = useState<Tag | null>(null)

  const fetcher = useCallback(
    () => Promise.all([getScope(teamId), getStatsRange(days, teamId), getTopics(days, teamId)]),
    [teamId, days],
  )
  const { data, error, loading, reload } = useLoader(fetcher)

  // Actions (repères 📣, statuts, avis, évolution), comparaison entreprise ; RH : tendances anonymes en plus
  const extrasFetcher = useCallback(
    () => Promise.all([
      getActions(100, teamId),
      getActionFeedback(teamId),
      getActionImpact(teamId).catch(() => new Map<number, ActionImpact>()),
      getBenchmark(days, teamId).catch(() => null),
      readOnly ? getReportSummaryRange(days, teamId).catch(() => []) : Promise.resolve([]),
    ]),
    [readOnly, teamId, days],
  )
  const extras = useLoader(extrasFetcher)

  const [scope, stats, topics] = data ?? [null, null, null]
  const [actions, feedback, impact, benchmark, anonymous] = extras.data ?? [[], new Map(), new Map(), null, []]
  const summary = useMemo(() => (stats ? summarize(stats) : null), [stats])
  const alert = summary ? alertMessage(summary) : null
  const suggestionTag = isTag(summary?.topTag) ? summary.topTag : null
  const participation = stats && scope ? participationRate(stats, scope.nb_membres) : null

  const exportCsv = () => {
    if (!stats || !scope) return
    const slug = scope.nom.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    downloadStatsCsv(stats, `workzen-${slug}-${days}j-${localISO()}.csv`)
  }

  return (
    <>
      <ConsoleHeader
        title={scope?.nom ?? "Vue d'ensemble"}
        subtitle={
          <>
            {scope?.manager && <>Manager : {scope.manager} · </>}
            {scope && <>{scope.nb_membres} membre{scope.nb_membres > 1 ? 's' : ''} · </>}
            {days} derniers jours, jusqu'à hier (la journée en cours n'est jamais affichée)
          </>
        }
      >
        <PeriodPicker value={days} onChange={setDays} />
        <button type="button" onClick={exportCsv} disabled={!stats} className={secondaryButton}>
          <Download size={16} aria-hidden="true" /> Export CSV
        </button>
        <RefreshButton onClick={reload} loading={loading} />
      </ConsoleHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}

      {!data && loading && (
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-gray-100 lg:col-span-3" />
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100 lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      )}

      {summary && stats && topics && (
        <div className={`mt-8 space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <dl className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white md:grid-cols-3 xl:grid-cols-5">
            <KpiCard label={`Moyenne ${days} j`} value={summary.avg30 !== null ? <>{formatDecimal(summary.avg30)}<span className="font-sans text-sm font-normal text-gray-500"> /5</span></> : '–'} />
            <KpiCard
              label="7 derniers jours"
              value={summary.last7 !== null ? formatDecimal(summary.last7) : '–'}
              trend={summary.trend}
            />
            <KpiCard label="Participation" value={participation !== null ? formatPercent(participation) : '–'} hint="réponses par jour / membres" />
            <KpiCard label="Réponses" value={summary.responses} hint="sur la période" />
            <KpiCard label="Sujet n°1 (7 j)" value={<span className="font-sans text-base leading-snug font-semibold">{summary.topTag ?? '–'}</span>} />
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {benchmark?.moyenne_equipe != null && benchmark.moyenne_entreprise != null ? (
              <p className="text-sm text-gray-700">
                Votre équipe <strong>{formatDecimal(benchmark.moyenne_equipe)}</strong> · Entreprise <strong>{formatDecimal(benchmark.moyenne_entreprise)}</strong>
                <span className="text-gray-400"> (moyenne sur {days} jours)</span>
              </p>
            ) : <span />}
            <div className="flex items-center gap-2">
              <ActionStatusSummary actions={actions} />
              {!readOnly && actions.length > 0 && <Link to="/console/actions" className="text-sm font-semibold text-brand-700 hover:underline">Suivre</Link>}
            </div>
          </div>

          {alert ? (
            <section aria-labelledby="console-alert" className="relative overflow-hidden rounded-2xl bg-white p-5 lg:p-6">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-amber-400" />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    <AlertTriangle size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="console-alert" className="font-semibold text-gray-900">À surveiller</h2>
                    <p className="mt-0.5 text-sm text-gray-600">{alert}</p>
                  </div>
                </div>
                {suggestionTag && (
                  <button type="button" onClick={() => setGuide(suggestionTag)} className={secondaryButton}>
                    <BookOpen size={16} aria-hidden="true" /> Comment agir ?
                  </button>
                )}
              </div>
              <h3 className="mt-5 text-xs font-medium text-gray-500">Pistes d'action{suggestionTag ? ` pour « ${suggestionTag} »` : ''}</h3>
              <ul className="mt-2 grid gap-2 md:grid-cols-3">
                {ACTION_SUGGESTIONS[suggestionTag ?? 'default'].map((s) => (
                  <li key={s} className="flex items-center gap-3 rounded-lg bg-wz-pale px-3.5 py-3">
                    <span className="flex-1 text-sm text-gray-900">{s}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setSheet({ message: s, tag: suggestionTag })}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-brand-600"
                      >
                        <Plus size={15} aria-hidden="true" /> Publier
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="flex items-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm text-gray-700"><CircleCheck size={18} aria-hidden="true" className="text-emerald-600" /> Rien d'alarmant cette semaine.</p>
          )}

          {published && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Action publiée pour l'équipe.</p>}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Moral moyen" className="lg:col-span-2">
              <MoodChart data={stats} markers={actions.map((a) => ({ date: a.created_at.slice(0, 10), message: a.message }))} />
              <p className="mt-2 text-xs text-gray-400">
                Les trous dans la courbe = jours avec moins de {ANONYMITY_THRESHOLD} réponses, masqués pour protéger l'anonymat.
              </p>
            </Card>
            <Card title="Sujets principaux">
              <TopicsTable topics={topics} limit={5} compact />
            </Card>
          </div>

          {readOnly && extras.data && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Actions publiées par le manager">
                {actions.length === 0
                  ? <p className="text-sm text-gray-500">Aucune action publiée.</p>
                  : <ActionList actions={actions.slice(0, 10)} mode="readonly" feedback={feedback} impact={impact} />}
              </Card>
              <Card title="Questionnaires anonymes">
                <AnonymousTrends summary={anonymous} periodLabel={`${days} jours`} />
              </Card>
            </div>
          )}
        </div>
      )}

      {sheet && (
        <PublishActionSheet
          initialMessage={sheet.message}
          initialTag={sheet.tag}
          onClose={() => setSheet(null)}
          onPublished={() => {
            setSheet(null)
            setPublished(true)
            extras.reload()
          }}
        />
      )}
      {guide && <GuideSheet tag={guide} onClose={() => setGuide(null)} />}
    </>
  )
}
