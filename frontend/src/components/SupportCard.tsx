import { Phone } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ContactRequestSheet } from './ContactRequestSheet'
import { isTag, SUPPORT_TIPS } from '../lib/constants'

/** 2 conseils : d'abord ceux des tags choisis, complétés par les conseils par défaut. */
function pickTips(tags: string[]): string[] {
  const fromTags = tags.filter(isTag).flatMap((t) => SUPPORT_TIPS[t])
  return [...new Set([...fromTags, ...SUPPORT_TIPS.default])].slice(0, 2)
}

/** Carte de soutien après une note de 1 ou 2. Purement locale : rien n'est envoyé. */
export function SupportCard({ tags }: { tags: string[] }) {
  const [contact, setContact] = useState(false)
  return (
    <section aria-labelledby="support-title" className="rounded-2xl bg-white p-5 text-left">
      <h2 id="support-title" className="font-semibold text-gray-900">
        Merci de l'avoir partagé. Ce n'est pas toujours facile.
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-gray-700">
        {pickTips(tags).map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden="true" className="text-brand-700">•</span>
            {tip}
          </li>
        ))}
      </ul>

      <h3 className="mt-5 text-sm font-semibold text-gray-900">Besoin d'en parler ?</h3>
      <ul className="mt-2 space-y-2 text-sm text-gray-700">
        <li>
          Ton manager ou les RH :{' '}
          <button type="button" onClick={() => setContact(true)} className="font-semibold text-brand-700 underline">
            demander un échange
          </button>
          {' '}(ta note n'est jamais transmise)
        </li>
        <li>
          La <strong>médecine du travail</strong> : un interlocuteur neutre, soumis au secret médical (consultation confidentielle)
        </li>
        <li>
          Si tu traverses une période très difficile :{' '}
          <a href="tel:3114" className="inline-flex items-center gap-1 font-semibold text-brand-700 underline">
            <Phone size={14} aria-hidden="true" />3114
          </a>
          , numéro national de prévention du suicide, gratuit, 24 h/24
        </li>
        <li>
          <Link to="/aide" className="font-semibold text-brand-700 underline">Tous les numéros et sites utiles</Link>
        </li>
      </ul>
      {contact && <ContactRequestSheet onClose={() => setContact(false)} />}
    </section>
  )
}
