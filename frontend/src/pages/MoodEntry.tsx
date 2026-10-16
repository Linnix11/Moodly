import { CalendarCheck, HeartHandshake, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMySharing } from '../api/sharing'
import { submitMood } from '../api/moods'
import { AppHeader } from '../components/AppHeader'
import { LatestActionCard } from '../components/LatestActionCard'
import { MoodPicker } from '../components/MoodPicker'
import { type ReportResult, ReportForm } from '../components/ReportForm'
import { Screen } from '../components/Screen'
import { SupportCard } from '../components/SupportCard'
import { TagChips } from '../components/TagChips'
import { TeamCountLine } from '../components/TeamCountLine'
import { LOW_MOOD_MAX, MAX_TAGS } from '../lib/constants'
import { localISO } from '../lib/date'
import { addEntry } from '../lib/journal'
import { todayISO, useAuth } from '../store/authStore'

/** Écran employé : saisie de l'humeur du jour (1 fois par jour). */
export default function MoodEntry() {
  const { profile, markMoodDoneToday } = useAuth()
  const [score, setScore] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSent, setJustSent] = useState(false)
  // Questionnaire après une mauvaise note : 'open' = affiché, sinon son résultat
  const [report, setReport] = useState<'none' | 'open' | ReportResult>('none')

  const [sharing, setSharing] = useState(false)
  useEffect(() => {
    getMySharing().then((s) => setSharing(s.actif), () => setSharing(false))
  }, [])

  const doneToday = profile?.last_mood_date === todayISO()
  const firstName = profile?.full_name?.split(' ')[0]

  const onSubmit = async () => {
    if (!score) return
    setSubmitting(true)
    setError(null)
    try {
      await submitMood(score, tags)
      // Journal privé : écrit dans le navigateur seulement, et seulement après une saisie réussie
      if (profile) await addEntry(profile.id, localISO(), score, tags).catch(() => undefined)
      setJustSent(true)
      if (score <= LOW_MOOD_MAX) setReport('open')
      markMoodDoneToday()
    } catch (err) {
      if ((err as Error).message === 'ALREADY_DONE') markMoodDoneToday()
      else setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (report === 'open' && score) {
    return (
      <Screen tabBar>
        <AppHeader />
        <ReportForm onFinish={setReport} />
      </Screen>
    )
  }

  if (doneToday) {
    return (
      <Screen tabBar>
        <AppHeader />
        <div className="wz-fade-in flex flex-1 flex-col justify-center gap-6">
          {justSent && score !== null && score <= LOW_MOOD_MAX && <SupportCard tags={tags} />}
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-wz-mint text-brand-700">
              {justSent ? <HeartHandshake size={30} aria-hidden="true" /> : <CalendarCheck size={30} aria-hidden="true" />}
            </span>
            <h1 className="mt-5 font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">{justSent ? 'Merci !' : 'À demain !'}</h1>
            <p className="mx-auto mt-2 max-w-xs leading-relaxed text-gray-500">
              {!justSent
                ? "Tu as déjà partagé ton humeur aujourd'hui. Reviens demain."
                : report === 'sent'
                  ? 'Ton humeur et tes réponses sont enregistrées anonymement. Prends soin de toi.'
                  : 'Ton humeur est enregistrée anonymement. Elle aide ton équipe à aller mieux.'}
            </p>
          </div>
          {justSent && <div className="text-center"><TeamCountLine /></div>}
          <LatestActionCard />
        </div>
      </Screen>
    )
  }

  return (
    <Screen tabBar>
      <AppHeader />
      {firstName && <p className="text-base text-gray-500">Salut {firstName},</p>}
      <h1 className="mt-1 font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">
        {firstName ? 'comment' : 'Comment'} te sens-tu aujourd'hui ?
      </h1>

      <div className="mt-8">
        <MoodPicker value={score} onChange={setScore} />
      </div>

      <div className={`mt-10 transition-opacity ${score ? '' : 'opacity-60'}`}>
        <h2 className="font-medium text-gray-900">
          Qu'est-ce qui joue ? <span className="text-sm font-normal text-gray-500">Facultatif, {MAX_TAGS} au plus</span>
        </h2>
        <div className="mt-3">
          <TagChips value={tags} onChange={setTags} />
        </div>
      </div>

      <div className="flex-1" />

      {/* Barre d'envoi collée au-dessus des onglets : toujours visible, même sur petit écran */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+3.9rem)] -mx-5 mt-6 bg-linear-to-t from-wz-pale from-75% to-wz-pale/0 px-5 pt-6 pb-3">
        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!score || submitting}
          className="w-full rounded-lg bg-brand-700 py-3.5 font-semibold text-white shadow-[0_8px_20px_-10px_rgb(22_123_123/0.7)] transition hover:bg-brand-800 active:translate-y-px disabled:bg-gray-300 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {submitting ? 'Envoi…' : score ? 'Envoyer mon humeur' : 'Choisis une humeur'}
        </button>
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
          <Lock size={12} aria-hidden="true" className="shrink-0" />
          {sharing
            ? 'Partage activé : ton manager verra cette réponse avec ton nom.'
            : "Réponse anonyme : ton nom n'est jamais enregistré avec."}
        </p>
      </div>
    </Screen>
  )
}
