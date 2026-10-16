import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getCompanyOverview, getScope, getStatsRange } from '../../api/console'
import type { TeamOverviewRow } from '../../api/types'
import { Card, ConsoleHeader, ErrorBox, KpiCard, PeriodPicker, RefreshButton } from '../../components/console/ConsoleUi'
import { MoodChart } from '../../components/MoodChart'
import { ANONYMITY_THRESHOLD } from '../../lib/constants'
import { formatDecimal } from '../../lib/date'
import { formatPercent, isWatched, participationRate, summarize, trendOf } from '../../lib/stats'
import { useLoader } from '../../lib/useLoader'

type SortKey = 'nom' | 'nb_membres' | 'nb_reponses_7j' | 'moyenne_7j' | 'tendance' | 'statut'
const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'nom', label: 'Équipe' },
  { key: 'nb_membres', label: 'Membres', numeric: true },
  { key: 'nb_reponses_7j', label: 'Réponses 7 j', numeric: true },
  { key: 'moyenne_7j', label: 'Moyenne 7 j', numeric: true },
  { key: 'tendance', label: 'Tendance', numeric: true },
  { key: 'statut', label: 'Statut' },
]

type StatusFilter = '' | 'watched' | 'ok' | 'hidden'

const fieldClass =
  'rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200'

function statusOf(r: TeamOverviewRow): Exclude<StatusFilter, ''> {
  if (isWatched(r)) return 'watched'
  return r.moyenne_7j === null ? 'hidden' : 'ok'
}

function sortValue(r: TeamOverviewRow, key: SortKey): number | string {
  if (key === 'nom') return r.nom.toLowerCase()
  if (key === 'tendance') return trendOf(r) ?? Number.POSITIVE_INFINITY
  if (key === 'statut') return isWatched(r) ? 0 : 1
  if (key === 'moyenne_7j') return r.moyenne_7j ?? Number.POSITIVE_INFINITY
  return r[key] ?? -1
}

/**
 * Console RH : moral de toute l'entreprise (ou d'une équipe choisie) + tableau de toutes les équipes.
 * Le filtre d'équipe est dans l'URL (?equipe=12) pour pouvoir partager la vue.
 */
export default function CompanyOverview() {
  const [days, setDays] = useState(30)
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'statut', asc: true })
  const [params, setParams] = useSearchParams()
  const teamParam = Number(params.get('equipe'))
  const teamId = Number.isInteger(teamParam) && teamParam > 0 ? teamParam : null
  const [status, setStatus] = useState<StatusFilter>('')
  const [query, setQuery] = useState('')

  const fetcher = useCallback(async () => {
    const teams = await getCompanyOverview()
    // Équipe de moins de 3 employés : le serveur refuse ses stats, inutile de les demander
    if (teamId !== null && teams.find((t) => t.equipe_id === teamId)?.masquee) return [null, null, teams] as const
    const [scope, stats] = await Promise.all([getScope(teamId), getStatsRange(days, teamId)])
    return [scope, stats, teams] as const
  }, [days, teamId])
  const { data, error, loading, reload } = useLoader(fetcher)
  const [scope, stats, teams] = data ?? [null, null, null]

  const selected = teamId !== null ? teams?.find((t) => t.equipe_id === teamId) ?? null : null
  const summary = useMemo(() => (stats ? summarize(stats) : null), [stats])
  const participation = stats && scope ? participationRate(stats, scope.nb_membres) : null

  const setTeam = (id: string) => {
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (id) next.set('equipe', id)
      else next.delete('equipe')
      return next
    }, { replace: true })
  }

  const visible = useMemo(() => {
    if (!teams) return []
    const q = query.trim().toLowerCase()
    return teams.filter((r) =>
      (teamId === null || r.equipe_id === teamId) &&
      (!status || statusOf(r) === status) &&
      (!q || r.nom.toLowerCase().includes(q) || (r.manager ?? '').toLowerCase().includes(q)),
    )
  }, [teams, teamId, status, query])
  const watched = visible.filter(isWatched).length

  const sorted = useMemo(() => {
    return [...visible].sort((a, b) => {
      const va = sortValue(a, sort.key)
      const vb = sortValue(b, sort.key)
      const cmp = va < vb ? -1 : va > vb ? 1 : a.nom.localeCompare(b.nom)
      return sort.asc ? cmp : -cmp
    })
  }, [visible, sort])

  const toggleSort = (key: SortKey) => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))

  return (
    <>
      <ConsoleHeader
        title={selected ? selected.nom : 'Entreprise'}
        subtitle={`${selected ? 'Une équipe' : 'Toutes les équipes'}, ${days} derniers jours jusqu'à hier. Données agrégées et anonymes.`}
      >
        <PeriodPicker value={days} onChange={setDays} />
        <RefreshButton onClick={reload} loading={loading} />
      </ConsoleHeader>

      <div role="search" aria-label="Filtres" className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3">
        <label htmlFor="overview-team" className="sr-only">Équipe</label>
        <select id="overview-team" value={teamId ?? ''} onChange={(e) => setTeam(e.target.value)} className={fieldClass}>
          <option value="">Toutes les équipes</option>
          {teams?.map((t) => <option key={t.equipe_id} value={t.equipe_id}>{t.nom}</option>)}
        </select>
        <label htmlFor="overview-status" className="sr-only">Statut</label>
        <select id="overview-status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={fieldClass}>
          <option value="">Tous les statuts</option>
          <option value="watched">À surveiller</option>
          <option value="ok">OK</option>
          <option value="hidden">Masquées / pas assez de réponses</option>
        </select>
        <div className="relative">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <label htmlFor="overview-search" className="sr-only">Rechercher une équipe ou un manager</label>
          <input id="overview-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Équipe ou manager" className={`${fieldClass} pl-9`} />
        </div>
        {(teamId !== null || status || query) && (
          <button type="button" onClick={() => { setTeam(''); setStatus(''); setQuery('') }} className="text-sm font-medium text-brand-700 hover:underline">
            Réinitialiser
          </button>
        )}
        {selected && (
          <Link to={`/console/equipes/${selected.equipe_id}`} className="ml-auto text-sm font-medium text-brand-700 hover:underline">
            Détail de l'équipe
          </Link>
        )}
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && loading && <div className="mt-8 h-96 animate-pulse rounded-2xl bg-gray-100" />}

      {selected?.masquee && (
        <p className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
          {selected.nom} compte moins de {ANONYMITY_THRESHOLD} employés : ses statistiques sont masquées pour protéger l'anonymat.
        </p>
      )}

      {teams && (
        <div className={`mt-6 space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {summary && stats && (<>
          <dl className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white md:grid-cols-3 xl:grid-cols-5">
            <KpiCard label={`Moyenne ${days} j`} value={summary.avg30 !== null ? formatDecimal(summary.avg30) : '–'} />
            <KpiCard
              label="7 derniers jours"
              value={summary.last7 !== null ? formatDecimal(summary.last7) : '–'}
              trend={summary.trend}
            />
            <KpiCard label="Participation" value={participation !== null ? formatPercent(participation) : '–'} hint={`${scope?.nb_membres ?? 0} employés`} />
            <KpiCard label="Équipes à surveiller" value={`${watched} / ${visible.length}`} tone={watched > 0 ? 'bad' : 'good'} />
            <KpiCard label="Sujet n°1 (7 j)" value={<span className="font-sans text-base leading-snug font-semibold">{summary.topTag ?? '–'}</span>} />
          </dl>

          <Card title={selected ? `Moral moyen : ${selected.nom}` : "Moral moyen de l'entreprise"}>
            <MoodChart data={stats} />
            <p className="mt-2 text-xs text-gray-400">
              Les trous dans la courbe = jours avec moins de {ANONYMITY_THRESHOLD} réponses {selected ? "dans l'équipe" : "dans l'entreprise"}.
            </p>
          </Card>
          </>)}

          <Card title={`Équipes (${visible.length}/${teams.length})`} action={<span className="text-xs text-gray-500">7 derniers jours clos, comparés aux 7 d'avant</span>}>
            {teams.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune équipe. Créez-en une dans « Équipes ».</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune équipe ne correspond aux filtres.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs text-gray-500">
                    <tr>
                      {COLUMNS.map((c) => (
                        <th
                          key={c.key}
                          scope="col"
                          aria-sort={sort.key === c.key ? (sort.asc ? 'ascending' : 'descending') : 'none'}
                          className={`py-2 pr-4 font-medium ${c.numeric ? 'text-right' : ''}`}
                        >
                          <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 rounded hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-brand-600">
                            {c.label}
                            {sort.key !== c.key ? <ArrowUpDown size={12} aria-hidden="true" /> : sort.asc ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
                          </button>
                        </th>
                      ))}
                      <th scope="col" className="py-2 font-medium">Sujet n°1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((r) => {
                      const trend = trendOf(r)
                      return (
                        <tr key={r.equipe_id} className="hover:bg-gray-50">
                          <th scope="row" className="py-3 pr-4 font-medium">
                            <Link to={`/console/equipes/${r.equipe_id}`} className="text-brand-700 hover:underline">{r.nom}</Link>
                            <p className="text-xs font-normal text-gray-500">{r.manager ?? 'Sans manager'}</p>
                          </th>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            <Link to={`/console/personnes?equipe=${r.equipe_id}`} title="Voir les membres" className="hover:underline">{r.nb_membres}</Link>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">{r.nb_reponses_7j ?? '🔒'}</td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {r.moyenne_7j !== null ? formatDecimal(r.moyenne_7j) : <span title={`Masqué : moins de ${ANONYMITY_THRESHOLD} réponses par jour`} className="text-gray-400">🔒</span>}
                          </td>
                          <td className={`py-3 pr-4 text-right tabular-nums ${trend !== null && trend <= -0.3 ? 'font-semibold text-red-600' : trend !== null && trend >= 0.3 ? 'text-emerald-600' : ''}`}>
                            {trend !== null ? `${trend >= 0 ? '+' : '−'}${formatDecimal(Math.abs(trend))}` : '–'}
                          </td>
                          <td className="py-3 pr-4">
                            {isWatched(r) ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                                <AlertTriangle size={12} aria-hidden="true" /> À surveiller
                              </span>
                            ) : r.moyenne_7j === null ? (
                              <span className="text-xs text-gray-400">{r.masquee ? 'Moins de 3 personnes : masquée' : 'Pas assez de réponses'}</span>
                            ) : (
                              <span className="text-xs text-emerald-700">OK</span>
                            )}
                          </td>
                          <td className="py-3 text-gray-700">{r.sujet ?? '–'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
