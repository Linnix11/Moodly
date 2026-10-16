import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { getActions, getMyVotes, reactToAction } from '../api/actions'
import { getTeamPulse } from '../api/team'
import type { TeamAction, TeamPulse } from '../api/types'
import { ActionList } from '../components/ActionList'
import { ContactRequestSheet } from '../components/ContactRequestSheet'
import { MySharedReports } from '../components/MySharedReports'
import { SharingCard } from '../components/SharingCard'
import { AppHeader } from '../components/AppHeader'
import { Screen } from '../components/Screen'
import { ANONYMITY_THRESHOLD, MOODS } from '../lib/constants'
import { formatDecimal } from '../lib/date'
import { MoodMark } from '../components/MoodMark'

// La météo peut être masquée (équipe de moins de 3) sans empêcher d'afficher les actions
const fetchAll = () => Promise.all([getTeamPulse().catch((err: Error) => err), getActions(10), getMyVotes()])

/** Météo de l'équipe côté employé : hier (journée close), participation du jour, actions du manager. */
export default function TeamPage() {
  const [pulse, setPulse] = useState<TeamPulse | null>(null)
  const [pulseError, setPulseError] = useState<string | null>(null)
  const [actions, setActions] = useState<TeamAction[]>([])
  const [votes, setVotes] = useState<Set<number>>(new Set())
  const [contact, setContact] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const apply = useCallback(([p, a, v]: Awaited<ReturnType<typeof fetchAll>>) => {
    if (p instanceof Error) {
      setPulse(null)
      setPulseError(p.message)
    } else {
      setPulse(p)
      setPulseError(null)
    }
    setActions(a)
    setVotes(v)
    setReady(true)
  }, [])

  const onVote = async (id: number, reaction: 'utile' | 'insuffisant') => {
    await reactToAction(id, reaction)
    setVotes((prev) => new Set(prev).add(id))
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      apply(await fetchAll())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [apply])

  // Premier chargement (le bouton « Actualiser » utilise load())
  useEffect(() => {
    fetchAll()
      .then(apply, (err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [apply])

  const mood = pulse?.hier_moyenne != null ? MOODS[Math.round(pulse.hier_moyenne) - 1] : null
  const ratio = pulse && pulse.nb_membres > 0 ? Math.min(1, pulse.aujourdhui_nb_reponses / pulse.nb_membres) : 0

  return (
    <Screen tabBar>
      <AppHeader />

      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">Météo de l'équipe</h1>
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

      {!pulse && loading && (
        <div className="mt-6 space-y-3">
          <div className="h-36 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      )}

      {pulse && (
        <>
          <section aria-labelledby="hier-title" className="wz-fade-in mt-6 rounded-2xl bg-white p-5">
            <h2 id="hier-title" className="text-sm font-medium text-gray-700">Hier dans l'équipe</h2>
            {pulse.hier_moyenne !== null && mood ? (
              <>
                <div className="mt-2 flex items-center gap-3">
                  <p className="font-display text-5xl font-medium text-gray-900 tabular-nums">
                    {formatDecimal(pulse.hier_moyenne)}<span className="font-sans text-base font-normal text-gray-600"> / 5</span>
                  </p>
                  <p className="flex items-center gap-2 text-sm font-medium text-gray-700"><MoodMark score={pulse.hier_moyenne} />{mood.label}</p>
                </div>
                {pulse.hier_top_tags.length > 0 && (
                  <p className="mt-3 text-sm text-gray-700">Sujets les plus cités : {pulse.hier_top_tags.join(', ')}</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-700">
                Pas assez de réponses hier pour afficher la moyenne : on protège l'anonymat (moins de {ANONYMITY_THRESHOLD} réponses).
              </p>
            )}
          </section>

          <section aria-labelledby="today-title" className="mt-3 rounded-2xl bg-white p-5">
            <h2 id="today-title" className="text-sm font-medium text-gray-500">Aujourd'hui</h2>
            <p className="mt-1 text-gray-900">
              <strong className="text-xl">{pulse.aujourdhui_nb_reponses} {pulse.aujourdhui_nb_reponses > 1 ? 'réponses' : 'réponse'}</strong>
              {pulse.nb_membres > 0 && <> sur {pulse.nb_membres}</>}
            </p>
            <div
              role="progressbar"
              aria-label="Participation de l'équipe aujourd'hui"
              aria-valuemin={0}
              aria-valuemax={pulse.nb_membres}
              aria-valuenow={pulse.aujourdhui_nb_reponses}
              className="mt-3 h-2 rounded-full bg-gray-100"
            >
              <div className="h-2 rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${ratio * 100}%` }} />
            </div>
            <p className="mt-3 text-xs text-gray-500">Plus il y a de réponses, plus la météo est fiable.</p>
          </section>

        </>
      )}

      {pulseError && <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-gray-600">{pulseError}</p>}

      {ready && (
        <>
          <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">Ce que ton manager a mis en place</h2>
          {actions.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-gray-500">
              Pas encore d'action publiée. Tes réponses aident ton manager à savoir où agir.
            </p>
          ) : (
            <ActionList actions={actions} mode="employee" votes={votes} onVote={onVote} />
          )}
        </>
      )}

      <section aria-labelledby="contact-title" className="mt-8 rounded-2xl bg-white p-5">
        <h2 id="contact-title" className="font-semibold text-gray-900">Besoin d'en parler ?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Demande un échange à ton manager ou aux RH, quand tu veux. Ta note et tes réponses ne sont jamais transmises.
        </p>
        <button
          type="button"
          onClick={() => setContact(true)}
          className="mt-3 w-full rounded-lg bg-brand-700 active:translate-y-px py-3 font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Demander un échange
        </button>
        <p className="mt-3 text-xs text-gray-500">
          Tu peux aussi contacter la médecine du travail : un interlocuteur neutre, soumis au secret médical.
        </p>
      </section>
      <SharingCard />
      <MySharedReports />
      {contact && <ContactRequestSheet onClose={() => setContact(false)} />}
    </Screen>
  )
}
