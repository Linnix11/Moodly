import { ChevronRight, UserRound } from 'lucide-react'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSharedHistory, listSharedPeople, markSharedReportHandled } from '../../api/sharedReports'
import type { SharedPerson } from '../../api/types'
import { Card, ConsoleHeader, ErrorBox, RefreshButton } from '../../components/console/ConsoleUi'
import { SharedReportCard } from '../../components/console/SharedReportCard'
import { frDate } from '../../lib/date'
import { useLoader } from '../../lib/useLoader'
import { useAuth } from '../../store/authStore'

/**
 * Fiches salariés : les questionnaires qu'un salarié a CHOISI de partager avec son nom
 * (question 4 : « en parler à mon manager / aux RH »). Le reste reste anonyme.
 */
export default function SharedReportsPage() {
  const isRh = useAuth((s) => s.profile?.role === 'rh')
  const { data: people, error, loading, reload } = useLoader(useCallback(() => listSharedPeople(), []))
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('salarie')
  const selected = people?.find((p) => p.user_id === selectedId) ?? null

  // Historique du salarié choisi (rechargé quand on change de fiche)
  const historyLoader = useLoader(useCallback(() => (selectedId ? getSharedHistory(selectedId) : Promise.resolve(null)), [selectedId]))
  const history = historyLoader.loading ? null : historyLoader.data
  const historyErrorMessage = historyLoader.error
  const loadHistory = historyLoader.reload

  const select = (p: SharedPerson) => setParams({ salarie: p.user_id }, { replace: true })

  return (
    <>
      <ConsoleHeader
        title="Fiches salariés"
        subtitle={`Questionnaires que les salariés ont choisi de partager avec leur nom ${isRh ? 'aux RH' : 'avec vous'}. Tout le reste reste anonyme.`}
      >
        <RefreshButton onClick={() => { reload(); loadHistory() }} loading={loading} />
      </ConsoleHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-6">
        <Card title={people ? `${people.length} salarié${people.length > 1 ? 's' : ''}` : 'Salariés'}>
          {!people && loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
          ) : people && people.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun questionnaire partagé pour l'instant. Un salarié partage le sien quand il répond « Oui, {isRh ? 'aux RH' : 'à mon manager'} » à la question « Aimerais-tu en parler à quelqu'un ? ».
            </p>
          ) : (
            <ul className="-mx-2 divide-y divide-gray-100">
              {people?.map((p) => (
                <li key={p.user_id}>
                  <button
                    type="button"
                    onClick={() => select(p)}
                    aria-current={p.user_id === selectedId ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-600
                      ${p.user_id === selectedId ? 'bg-wz-pale' : 'hover:bg-gray-50'}`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wz-pale text-brand-700"><UserRound size={18} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">{p.nom}</span>
                      <span className="block text-xs text-gray-500">
                        {p.nb} questionnaire{p.nb > 1 ? 's' : ''} · dernier le {frDate(p.dernier)}{isRh && p.equipe ? ` · ${p.equipe}` : ''}
                      </span>
                    </span>
                    {p.a_traiter > 0 && (
                      <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{p.a_traiter} à traiter</span>
                    )}
                    <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-gray-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={selected ? `Fiche de ${selected.nom}` : 'Fiche'}>
          {!selected ? (
            <p className="text-sm text-gray-500">Choisissez un salarié pour voir l'historique de ses questionnaires partagés.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-500">
                {selected.nb} questionnaire{selected.nb > 1 ? 's' : ''} partagé{selected.nb > 1 ? 's' : ''}, du plus récent au plus ancien.
                Ses notes d'humeur quotidiennes restent anonymes et n'apparaissent pas ici.
              </p>
              {historyErrorMessage && <ErrorBox message={historyErrorMessage} onRetry={loadHistory} />}
              {!history && !historyErrorMessage && <div className="h-40 animate-pulse rounded-xl bg-gray-100" />}
              {history && (
                <ul className="space-y-3">
                  {history.map((r) => (
                    <SharedReportCard
                      key={r.id}
                      report={r}
                      onHandled={async () => {
                        await markSharedReportHandled(r.id)
                        loadHistory()
                        reload()
                      }}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  )
}
