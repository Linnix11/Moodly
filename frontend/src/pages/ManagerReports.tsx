import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listContactRequests, markContactHandled } from '../api/contact'
import { getReportComments, getReportSummary } from '../api/reports'
import type { ContactRequest, ReportSummaryRow } from '../api/types'
import { AppHeader } from '../components/AppHeader'
import { ContactRequestList } from '../components/ContactRequestList'
import { AnonymousComments, AnonymousTrends } from '../components/ReportViews'
import { Screen } from '../components/Screen'

const fetchAll = () => Promise.all([listContactRequests(), getReportSummary(), getReportComments()])

/** Vue manager : rapports envoyés après une mauvaise humeur (nominatifs + tendances anonymes). */
export default function ManagerReports() {
  const [reports, setReports] = useState<ContactRequest[] | null>(null)
  const [summary, setSummary] = useState<ReportSummaryRow[] | null>(null)
  const [comments, setComments] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, s, c] = await fetchAll()
      setReports(r)
      setSummary(s)
      setComments(c)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Premier chargement (le bouton « Actualiser » utilise load())
  useEffect(() => {
    fetchAll()
      .then(([r, s, c]) => {
        setReports(r)
        setSummary(s)
        setComments(c)
      }, (err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Screen>
      <AppHeader subtitle="Vue manager" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/manager" className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={16} /> Tableau de bord
          </Link>
          <h1 className="font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">Rapports</h1>
          <p className="text-sm text-gray-500">Après une mauvaise humeur, 30 derniers jours</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Actualiser"
          title="Actualiser"
          className="rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button type="button" onClick={load} className="ml-2 font-semibold underline">Réessayer</button>
        </div>
      )}

      {!reports && loading && <div className="mt-6 h-96 animate-pulse rounded-2xl bg-gray-100" />}

      {reports && summary && (
        <>
          <h2 className="mt-6 mb-3 text-lg font-semibold text-gray-900">Demandes d'échange</h2>
          <ContactRequestList requests={reports} onHandled={async (id) => { await markContactHandled(id); load() }} />

          <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">Tendances anonymes</h2>
          <AnonymousTrends summary={summary} />

          <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">Ce qu'ils ont écrit</h2>
          <AnonymousComments comments={comments} />
        </>
      )}
    </Screen>
  )
}
