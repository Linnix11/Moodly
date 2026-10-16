import { useEffect, useId, useState } from 'react'
import { getMySharing } from '../api/sharing'
import { submitReport } from '../api/reports'
import { REPORT_QUESTIONS, SHARE_QUESTION, shareTarget } from '../lib/constants'

export type ReportResult = 'skipped' | 'sent'

const COMMENT_MAX = 500

interface Props {
  onFinish: (result: ReportResult) => void
}

const chipClass = (selected: boolean) =>
  `rounded-lg px-3.5 py-2 text-sm transition
   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600
   ${selected ? 'bg-brand-700 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'}`

/** Questionnaire facultatif proposé après une mauvaise humeur (5 QCM + choix de l'anonymat). */
export function ReportForm({ onFinish }: Props) {
  const [answers, setAnswers] = useState<(string | null)[]>(REPORT_QUESTIONS.map(() => null))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const commentId = useId()
  const commentHintId = useId()

  const complete = answers.every((a) => a !== null)
  // Partage activé dans l'onglet Équipe : le questionnaire va au manager, sauf choix « aux RH »
  const [sharing, setSharing] = useState(false)
  useEffect(() => {
    getMySharing().then((s) => setSharing(s.actif), () => setSharing(false))
  }, [])
  const sharedWith = shareTarget(answers) ?? (sharing ? 'manager' : null)
  const who = sharedWith === 'rh' ? 'Les RH' : 'Ton manager'

  const choose = (question: number, id: string) => {
    setAnswers((prev) => prev.map((a, i) => (i === question ? id : a)))
    setError(null)
  }

  const onSubmit = async () => {
    if (!complete) return
    setSubmitting(true)
    setError(null)
    try {
      await submitReport(answers as string[], comment)
      onFinish('sent')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <h1 className="font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">Ça n'a pas l'air d'aller…</h1>
      <p className="mt-2 text-gray-500">5 questions rapides pour aider ton équipe à comprendre. C'est facultatif.</p>
      {sharing && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          Partage activé : ce questionnaire sera transmis à ton manager <strong>avec ton nom</strong> (aux RH si tu choisis « Oui, aux RH »).
          Tu peux arrêter le partage dans l'onglet Équipe.
        </p>
      )}

      <ol className="mt-6 space-y-6">
        {REPORT_QUESTIONS.map((q, qi) => (
          <li key={q.label}>
            <h2 className="text-sm font-medium text-gray-700">{qi + 1}. {q.label}</h2>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={q.label}>
              {q.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={answers[qi] === c.id}
                  onClick={() => choose(qi, c.id)}
                  className={chipClass(answers[qi] === c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {qi === SHARE_QUESTION && shareTarget(answers) && (
              <p role="status" className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                {who} {sharedWith === 'rh' ? 'verront' : 'verra'} <strong>ce questionnaire avec ton nom</strong> et la date, pour pouvoir revenir vers toi.
                {sharedWith === 'rh' ? 'Ils sauront' : 'Il saura'} donc que ça n'allait pas ce jour-là. Ta note d'humeur, elle, reste anonyme.
                Si tu préfères rester anonyme, choisis une autre réponse.
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <label htmlFor={commentId} className="text-sm font-medium text-gray-700">
          Tu veux ajouter quelque chose ? <span className="font-normal text-gray-500">Facultatif</span>
        </label>
        <textarea
          id={commentId}
          rows={3}
          maxLength={COMMENT_MAX}
          value={comment}
          onChange={(e) => { setComment(e.target.value); setError(null) }}
          aria-describedby={commentHintId}
          placeholder="Ce qui t'aiderait, ce qui se passe, en quelques mots…"
          className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-base transition-colors outline-none hover:border-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
        <div id={commentHintId} className="mt-1 flex justify-between gap-4 text-xs text-gray-500">
          <span>{sharedWith ? `${who} le ${sharedWith === 'rh' ? 'liront' : 'lira'} avec ton nom.` : 'Ton manager le lira tel quel, sans ton nom. Évite les détails qui permettraient de te reconnaître.'}</span>
          <span className="shrink-0 tabular-nums">{comment.length}/{COMMENT_MAX}</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-500">
        {sharedWith
          ? `Questionnaire partagé avec ton nom : ${sharedWith === 'rh' ? 'les RH le verront' : 'ton manager le verra'} en entier.`
          : "Réponses 100 % anonymes : ton manager ne voit qu'un résumé, et seulement à partir de 3 questionnaires."}
      </p>

      <div className="flex-1" />

      {error && <p role="alert" className="mt-6 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!complete || submitting}
        className="mt-6 w-full rounded-lg bg-brand-700 active:translate-y-px py-3.5 font-semibold text-white transition hover:bg-brand-800 disabled:bg-gray-300"
      >
        {submitting ? 'Envoi…' : !complete ? 'Réponds à toutes les questions' : sharedWith === 'manager' ? 'Envoyer à mon manager' : sharedWith === 'rh' ? 'Envoyer aux RH' : 'Envoyer'}
      </button>
      <button
        type="button"
        onClick={() => onFinish('skipped')}
        disabled={submitting}
        className="mt-2 w-full rounded-xl py-3 text-sm font-medium text-gray-500 hover:bg-gray-100"
      >
        Passer
      </button>
    </>
  )
}
