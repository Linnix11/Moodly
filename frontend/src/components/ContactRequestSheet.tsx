import { useRef, useState } from 'react'
import { type Preference, requestContact } from '../api/contact'
import { useTopics } from '../lib/useTopics'
import { Sheet } from './Sheet'

const chip = (selected: boolean) =>
  `rounded-lg px-3.5 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600
   ${selected ? 'bg-brand-700 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'}`

/**
 * « Besoin d'en parler ? » (A1) : demande d'échange avec le manager.
 * Ne contient NI note, NI réponse au questionnaire, NI lien avec une humeur.
 */
export function ContactRequestSheet({ onClose }: { onClose: () => void }) {
  const [preference, setPreference] = useState<Preference | null>(null)
  const topics = useTopics()
  const [tag, setTag] = useState('')
  const [status, setStatus] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const submit = async () => {
    if (!preference || inFlight.current) return
    inFlight.current = true
    setStatus('busy')
    setError(null)
    try {
      await requestContact('manager', preference, tag || null)
      setStatus('sent')
    } catch (err) {
      setError((err as Error).message)
      setStatus('idle')
      inFlight.current = false
    }
  }

  if (status === 'sent') {
    return (
      <Sheet title="Demande envoyée" onClose={onClose}>
        <p className="mt-3 text-gray-700">
          Ton manager va revenir vers toi cette semaine.
          Ta demande ne contient ni ta note ni tes réponses.
        </p>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-lg bg-brand-700 active:translate-y-px py-3.5 font-semibold text-white hover:bg-brand-800">
          Fermer
        </button>
      </Sheet>
    )
  }

  return (
    <Sheet title="Besoin d'en parler ?" onClose={onClose}>
      <p className="mt-1 text-sm text-gray-500">
        Ta demande est envoyée à ton manager. Elle indique seulement ton nom, la semaine et, si tu veux, un sujet. Jamais ta note ni tes réponses.
      </p>


      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-gray-700">Comment ?</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Comment ?">
          <button type="button" role="radio" aria-checked={preference === 'en_personne'} onClick={() => setPreference('en_personne')} className={chip(preference === 'en_personne')}>En personne</button>
          <button type="button" role="radio" aria-checked={preference === 'message'} onClick={() => setPreference('message')} className={chip(preference === 'message')}>Par message</button>
        </div>
      </fieldset>

      <label htmlFor="contact-tag" className="mt-5 mb-1.5 block text-sm font-medium text-gray-700">
        Sujet <span className="font-normal text-gray-400">(facultatif)</span>
      </label>
      <select
        id="contact-tag"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
      >
        <option value="">Je préfère ne pas préciser</option>
        {topics.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      <p className="mt-5 rounded-xl bg-brand-50 px-3 py-2 text-xs text-gray-600">
        Tu peux aussi contacter la <strong>médecine du travail</strong> : un interlocuteur neutre, soumis au secret médical.
      </p>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!preference || status === 'busy'}
        className="mt-5 w-full rounded-lg bg-brand-700 active:translate-y-px py-3.5 font-semibold text-white transition hover:bg-brand-800 disabled:bg-gray-300"
      >
        {status === 'busy' ? 'Envoi…' : 'Envoyer ma demande'}
      </button>
    </Sheet>
  )
}
