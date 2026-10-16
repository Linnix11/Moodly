import { useEffect, useId, useRef, useState } from 'react'
import { publishAction, updateAction } from '../api/actions'
import { useTopics } from '../lib/useTopics'
import { Sheet } from './Sheet'

const MIN = 5
const MAX = 280

interface Props {
  /** Si fourni : modification de cette action au lieu d'une publication */
  actionId?: number
  initialMessage?: string
  initialTag?: string | null
  onClose: () => void
  onPublished: () => void
}

/** Panneau pour publier (ou modifier) une action. À monter uniquement quand il est ouvert. */
export function PublishActionSheet({ actionId, initialMessage = '', initialTag = null, onClose, onPublished }: Props) {
  const [message, setMessage] = useState(initialMessage)
  const topics = useTopics()
  const [tag, setTag] = useState(initialTag ?? '')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Anti double clic : bloque un 2e envoi avant même le prochain rendu
  const inFlight = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fieldId = useId()
  const hintId = useId()

  const length = message.trim().length
  const valid = length >= MIN && length <= MAX
  const showInvalid = touched && length < MIN

  // Curseur à la fin du texte prérempli
  useEffect(() => {
    const t = textareaRef.current
    t?.setSelectionRange(t.value.length, t.value.length)
  }, [])

  const onSubmit = async () => {
    if (!valid || inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      if (actionId !== undefined) await updateAction(actionId, message.trim(), tag || null)
      else await publishAction(message.trim(), tag || null)
      onPublished()
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
      inFlight.current = false
    }
  }

  return (
    <Sheet title={actionId !== undefined ? "Modifier l'action" : 'Publier une action'} onClose={onClose} initialFocus={textareaRef}>
      <label htmlFor={fieldId} className="mt-4 mb-1.5 block text-sm font-medium text-gray-700">
        Qu'allez-vous faire suite aux retours ?
      </label>
      <textarea
        ref={textareaRef}
        id={fieldId}
        rows={4}
        maxLength={MAX}
        value={message}
        onChange={(e) => { setMessage(e.target.value); setError(null) }}
        onBlur={() => setTouched(true)}
        aria-invalid={showInvalid}
        aria-describedby={hintId}
        className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200 aria-invalid:border-red-500"
        placeholder="Ex. : on décale la livraison d'une semaine pour souffler."
      />
      <div id={hintId} className="mt-1 flex justify-between text-xs">
        <span className={showInvalid ? 'text-red-600' : 'text-gray-400'}>
          {showInvalid ? `Au moins ${MIN} caractères.` : "Visible par toute l'équipe."}
        </span>
        <span className="text-gray-400">{message.length}/{MAX}</span>
      </div>

      <label htmlFor={`${fieldId}-tag`} className="mt-4 mb-1.5 block text-sm font-medium text-gray-700">
        Sujet concerné <span className="font-normal text-gray-400">(facultatif)</span>
      </label>
      <select
        id={`${fieldId}-tag`}
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
      >
        <option value="">Aucun</option>
        {topics.map((t) => <option key={t} value={t}>{t}</option>)}
        {tag && !topics.includes(tag) && <option value={tag}>{tag}</option>}
      </select>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!valid || submitting}
        className="mt-5 w-full rounded-lg bg-brand-700 active:translate-y-px py-3.5 font-semibold text-white transition hover:bg-brand-800 disabled:bg-gray-300"
      >
        {actionId !== undefined
          ? (submitting ? 'Enregistrement…' : 'Enregistrer')
          : (submitting ? 'Publication…' : "Publier pour l'équipe")}
      </button>
    </Sheet>
  )
}
