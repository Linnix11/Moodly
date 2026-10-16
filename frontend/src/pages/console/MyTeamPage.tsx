import { ChevronRight, Eye, EyeOff, UserRound } from 'lucide-react'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMemberMoods, listTeamMembers } from '../../api/sharing'
import { getSharedHistory, markSharedReportHandled } from '../../api/sharedReports'
import type { MemberMood, TeamMember } from '../../api/types'
import { Card, ConsoleHeader, ErrorBox, RefreshButton } from '../../components/console/ConsoleUi'
import { SharedReportCard } from '../../components/console/SharedReportCard'
import { MOODS } from '../../lib/constants'
import { formatDecimal, frDate } from '../../lib/date'
import { useLoader } from '../../lib/useLoader'
import { MoodMark } from '../../components/MoodMark'

/** Badge d'état d'un membre : ce qu'il a accepté de partager. */
function SharingBadge({ m }: { m: TeamMember }) {
  if (m.partage) {
    return <span className="inline-flex items-center gap-1 rounded-md bg-wz-mint px-2 py-0.5 text-xs font-semibold text-brand-700"><Eye size={12} aria-hidden="true" /> Partage activé</span>
  }
  if (m.nb_questionnaires > 0) {
    return <span className="rounded-md bg-wz-pale px-2 py-0.5 text-xs font-medium text-gray-700">{m.nb_questionnaires} questionnaire{m.nb_questionnaires > 1 ? 's' : ''}</span>
  }
  return <span className="inline-flex items-center gap-1 text-xs text-gray-500"><EyeOff size={12} aria-hidden="true" /> Anonyme</span>
}

/** Humeurs partagées : moyenne et liste jour par jour (90 derniers jours). */
function MoodHistory({ moods }: { moods: MemberMood[] }) {
  if (moods.length === 0) {
    return <p className="text-sm text-gray-500">Pas encore d'humeur partagée depuis l'activation du partage.</p>
  }
  const last30 = moods.slice(0, 30)
  const avg = last30.reduce((s, m) => s + m.score, 0) / last30.length
  return (
    <>
      <p className="text-sm text-gray-600">
        Moyenne sur ses {last30.length} dernière{last30.length > 1 ? 's' : ''} réponse{last30.length > 1 ? 's' : ''} : <strong className="text-gray-900">{formatDecimal(avg)} / 5</strong>
      </p>
      <ul className="mt-3 divide-y divide-gray-100 rounded-xl ring-1 ring-gray-200">
        {moods.map((m) => {
          const mood = MOODS[m.score - 1]
          return (
            <li key={m.mood_date} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
              <span className="w-24 shrink-0 tabular-nums text-gray-500">{frDate(m.mood_date)}</span>
              <span className={`font-medium ${m.score <= 2 ? 'text-red-700' : 'text-gray-900'}`}>
                <MoodMark score={m.score} className="mr-1.5" />{mood?.label}
              </span>
              {m.tags.length > 0 && <span className="text-gray-500">{m.tags.join(' · ')}</span>}
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** Fiche d'un membre : humeurs (si partage activé) puis questionnaires partagés. */
function MemberDetail({ member, onChanged }: { member: TeamMember; onChanged: () => void }) {
  const fetcher = useCallback(
    () => Promise.all([member.partage ? getMemberMoods(member.user_id) : Promise.resolve([] as MemberMood[]), getSharedHistory(member.user_id)]),
    [member.user_id, member.partage],
  )
  const { data, error, loading, reload } = useLoader(fetcher)

  if (!member.partage && member.nb_questionnaires === 0) {
    return (
      <p className="text-sm text-gray-600">
        {member.nom} n'a pas choisi de partager ses réponses. Son humeur reste anonyme et compte dans les moyennes de l'équipe.
        Il ou elle peut activer le partage à tout moment depuis l'onglet « Équipe » de l'app.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBox message={error} onRetry={reload} />}
      {(!data || loading) && !error && <div className="h-40 animate-pulse rounded-xl bg-gray-100" />}
      {data && !loading && (
        <>
          {member.partage ? (
            <section>
              <h3 className="mb-2 font-semibold text-gray-900">Humeur du jour (90 derniers jours)</h3>
              <MoodHistory moods={data[0]} />
            </section>
          ) : (
            <p className="text-sm text-gray-600">
              Le partage de l'humeur n'est pas activé : seuls les questionnaires qu'il ou elle vous a adressés apparaissent.
            </p>
          )}
          <section>
            <h3 className="mb-2 font-semibold text-gray-900">Questionnaires</h3>
            {data[1].length === 0 ? (
              <p className="text-sm text-gray-500">Aucun questionnaire partagé avec vous.</p>
            ) : (
              <ul className="space-y-3">
                {data[1].map((r) => (
                  <SharedReportCard
                    key={r.id}
                    report={r}
                    onHandled={async () => {
                      await markSharedReportHandled(r.id)
                      reload()
                      onChanged()
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

/** Console manager : les membres de l'équipe, et pour chacun ce qu'il a accepté de partager. */
export default function MyTeamPage() {
  const { data: members, error, loading, reload } = useLoader(useCallback(() => listTeamMembers(), []))
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('membre')
  const selected = members?.find((m) => m.user_id === selectedId) ?? null
  const sharingCount = members?.filter((m) => m.partage).length ?? 0

  return (
    <>
      <ConsoleHeader
        title="Mon équipe"
        subtitle="Les réponses d'un membre ne s'affichent que s'il a choisi de les partager avec vous. Les autres restent anonymes."
      >
        <RefreshButton onClick={reload} loading={loading} />
      </ConsoleHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-6">
        <Card
          title={members ? `${members.length} membre${members.length > 1 ? 's' : ''}` : 'Membres'}
          action={members && <span className="text-xs text-gray-500">{sharingCount} partage{sharingCount > 1 ? 'nt' : ''}</span>}
        >
          {!members && loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
          ) : members && members.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun employé rattaché à votre équipe.</p>
          ) : (
            <ul className="-mx-2 divide-y divide-gray-100">
              {members?.map((m) => (
                <li key={m.user_id}>
                  <button
                    type="button"
                    onClick={() => setParams({ membre: m.user_id }, { replace: true })}
                    aria-current={m.user_id === selectedId ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-600
                      ${m.user_id === selectedId ? 'bg-wz-pale' : 'hover:bg-gray-50'}`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wz-pale text-brand-700"><UserRound size={18} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">{m.nom}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2"><SharingBadge m={m} /></span>
                    </span>
                    {m.a_traiter > 0 && (
                      <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{m.a_traiter} à traiter</span>
                    )}
                    <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-gray-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={selected ? selected.nom : 'Fiche'}>
          {selected ? (
            <MemberDetail key={selected.user_id} member={selected} onChanged={reload} />
          ) : (
            <p className="text-sm text-gray-500">Choisissez un membre pour voir ce qu'il a accepté de partager.</p>
          )}
        </Card>
      </div>
    </>
  )
}
