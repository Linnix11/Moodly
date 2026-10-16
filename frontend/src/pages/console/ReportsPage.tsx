import { useCallback, useState } from 'react'
import { getReportCommentsRange, getReportSummaryRange } from '../../api/console'
import { listContactRequests, markContactHandled } from '../../api/contact'
import { Card, ConsoleHeader, ErrorBox, PeriodPicker, RefreshButton } from '../../components/console/ConsoleUi'
import { ContactRequestList } from '../../components/ContactRequestList'
import { AnonymousComments, AnonymousTrends } from '../../components/ReportViews'
import { useLoader } from '../../lib/useLoader'

/** Console manager : rapports nominatifs (30 j) et tendances anonymes (période au choix, jusqu'à hier). */
export default function ReportsPage() {
  const [days, setDays] = useState(30)
  const fetcher = useCallback(() => Promise.all([listContactRequests(), getReportSummaryRange(days), getReportCommentsRange(days)]), [days])
  const { data, error, loading, reload } = useLoader(fetcher)

  return (
    <>
      <ConsoleHeader title="Rapports" subtitle="Questionnaires remplis après une mauvaise humeur.">
        <PeriodPicker value={days} onChange={setDays} />
        <RefreshButton onClick={reload} loading={loading} />
      </ConsoleHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && loading && <div className="mt-8 h-96 animate-pulse rounded-2xl bg-gray-100" />}

      {data && (
        <div className={`mt-8 grid gap-6 lg:grid-cols-2 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <Card title="Demandes d'échange">
            <p className="mb-3 text-xs text-gray-500">Seuls le nom, le sujet et la semaine sont transmis : jamais la note ni les réponses.</p>
            <ContactRequestList requests={data[0]} onHandled={async (id) => { await markContactHandled(id); reload() }} />
          </Card>
          <Card title={`Tendances anonymes (${days} jours, jusqu'à hier)`}>
            <AnonymousTrends summary={data[1]} periodLabel={`${days} jours`} />
          </Card>
          <Card title="Ce qu'ils ont écrit" className="lg:col-span-2">
            <AnonymousComments comments={data[2]} periodLabel={`${days} jours`} />
          </Card>
        </div>
      )}
    </>
  )
}
