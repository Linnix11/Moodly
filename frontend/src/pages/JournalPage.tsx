import { ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Screen } from '../components/Screen'
import { MOODS } from '../lib/constants'
import { localISO } from '../lib/date'
import { clearJournal, getJournal, type Journal } from '../lib/journal'
import { useAuth } from '../store/authStore'
import { MoodMark } from '../components/MoodMark'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Valeur la plus fréquente d'une liste (null si vide). */
function mostFrequent<T>(values: T[]): T | null {
  const counts = new Map<T, number>()
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Journal privé de l'employé : lu UNIQUEMENT depuis le navigateur, aucune requête réseau. */
export default function JournalPage() {
  const userId = useAuth((s) => s.profile?.id)
  const [journal, setJournal] = useState<Journal | null>(null)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [today] = useState(() => localISO())

  useEffect(() => {
    if (userId) getJournal(userId).then(setJournal)
  }, [userId])

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const isCurrentMonth = localISO(month).slice(0, 7) === today.slice(0, 7)

  // Cases du calendrier : cases vides avant le 1er (semaine commençant le lundi), puis un jour par case
  const cells = useMemo(() => {
    const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7
    const days = new Date(year, monthIndex + 1, 0).getDate()
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: days }, (_, i) => localISO(new Date(year, monthIndex, i + 1))),
    ]
  }, [year, monthIndex])

  const monthEntries = cells.flatMap((d) => (d && journal?.[d] ? [journal[d]] : []))
  const topScore = mostFrequent(monthEntries.map((e) => e.score))
  const topTag = mostFrequent(monthEntries.flatMap((e) => e.tags))
  const selectedEntry = selected ? journal?.[selected] : undefined
  const isEmpty = journal !== null && Object.keys(journal).length === 0

  const changeMonth = (delta: number) => {
    setMonth(new Date(year, monthIndex + delta, 1))
    setSelected(null)
  }

  const onClear = async () => {
    if (!userId) return
    await clearJournal(userId)
    setJournal({})
    setSelected(null)
    setConfirmClear(false)
  }

  const monthLabel = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <Screen tabBar>
      <AppHeader />
      <h1 className="font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">Mon journal</h1>
      <p className="mt-1 text-sm text-gray-500">Visible uniquement sur cet appareil. Rien n'est envoyé à ton entreprise.</p>


      {journal === null ? (
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-gray-100" />
      ) : isEmpty ? (
        <div className="mt-6 rounded-2xl bg-white p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-wz-pale text-brand-700"><NotebookPen size={24} aria-hidden="true" /></span>
          <p className="mt-3 font-semibold text-gray-900">Ton journal se remplira au fil de tes réponses</p>
          <Link
            to="/mood"
            className="mt-4 inline-block rounded-lg bg-brand-700 active:translate-y-px px-5 py-3 font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Partager mon humeur du jour
          </Link>
        </div>
      ) : (
        <>
          <section aria-label={`Calendrier de ${monthLabel}`} className="mt-6 rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Mois précédent"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="font-semibold text-gray-900 first-letter:uppercase" aria-live="polite">{monthLabel}</h2>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                disabled={isCurrentMonth}
                aria-label="Mois suivant"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center" aria-hidden="true">
              {WEEKDAYS.map((d, i) => <span key={i} className="text-xs font-medium text-gray-400">{d}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <span key={`empty-${i}`} />
                const entry = journal[date]
                const day = Number(date.slice(8))
                const ring = date === today ? 'ring-2 ring-brand-300' : ''
                if (!entry) {
                  return (
                    <div key={date} className={`flex aspect-square flex-col items-center justify-center rounded-xl ${ring}`}>
                      <span className="text-[0.625rem] text-gray-400">{day}</span>
                      <span className="mt-1 size-1.5 rounded-full bg-gray-300" aria-hidden="true" />
                      <span className="sr-only">{longDate(date)} : rien de saisi</span>
                    </div>
                  )
                }
                const mood = MOODS[entry.score - 1]
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelected(date === selected ? null : date)}
                    aria-pressed={date === selected}
                    aria-label={`${longDate(date)} : ${mood?.label ?? ''}`}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl transition hover:bg-brand-50
                      focus-visible:outline-2 focus-visible:outline-brand-600 ${date === selected ? 'bg-brand-100' : ''} ${ring}`}
                  >
                    <span className="text-[0.625rem] text-gray-500">{day}</span>
                    <MoodMark score={entry.score} className="mt-1 h-4 w-2.5" />
                  </button>
                )
              })}
            </div>
          </section>

          {selected && selectedEntry && (
            <section aria-live="polite" className="mt-3 rounded-2xl bg-white p-4">
              <p className="text-sm text-gray-500 first-letter:uppercase">{longDate(selected)}</p>
              <p className="mt-1 font-semibold text-gray-900">
                <MoodMark score={selectedEntry.score} className="mr-2" />{MOODS[selectedEntry.score - 1]?.label}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {selectedEntry.tags.length > 0 ? selectedEntry.tags.join(' · ') : 'Aucun sujet choisi'}
              </p>
            </section>
          )}

          <p className="mt-4 text-sm text-gray-600">
            {monthEntries.length === 0
              ? 'Aucun jour partagé ce mois-ci.'
              : [
                  `${monthEntries.length} ${monthEntries.length > 1 ? 'jours partagés' : 'jour partagé'} ce mois-ci`,
                  topScore ? `humeur la plus fréquente : ${MOODS[topScore - 1]?.label.toLowerCase()}` : null,
                  topTag ? `sujet le plus fréquent : ${topTag}` : null,
                ].filter(Boolean).join(' · ')}
          </p>

          <div className="mt-8 text-center">
            {confirmClear ? (
              <div role="group" aria-label="Confirmer l'effacement" className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm">
                <span className="flex-1 text-left text-red-800">Effacer tout ton journal ?</span>
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Oui
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg px-3 py-1.5 font-medium text-gray-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                Effacer mon journal
              </button>
            )}
          </div>
        </>
      )}
    </Screen>
  )
}
