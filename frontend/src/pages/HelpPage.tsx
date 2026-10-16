import { ArrowLeft, ExternalLink, LifeBuoy, MessageSquare, Phone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Screen } from '../components/Screen'
import { HELP_CHECKED, HELP_SECTIONS, HELP_SOURCE, type HelpEntry, phoneHref } from '../lib/helpResources'
import { useAuth } from '../store/authStore'

/** Une ressource : nom, description, horaires, bouton d'appel (ou SMS) et lien. */
function Entry({ e, urgent }: { e: HelpEntry; urgent: boolean }) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <p className="font-semibold text-gray-900">{e.name}</p>
      <p className="mt-0.5 text-sm text-gray-600">{e.description}</p>
      {e.hours && <p className="mt-1 text-xs text-gray-500">{e.hours}</p>}
      {(e.phone || e.url) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {e.phone && (
            <a
              href={phoneHref(e)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap text-white active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2
                ${urgent ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600' : 'bg-brand-700 hover:bg-brand-800 focus-visible:outline-brand-600'}`}
            >
              {e.sms ? <MessageSquare size={16} aria-hidden="true" /> : <Phone size={16} aria-hidden="true" />}
              {e.sms ? `SMS au ${e.phone}` : `Appeler le ${e.phone}`}
            </a>
          )}
          {e.url && (
            <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-brand-700 hover:underline">
              {e.urlLabel ?? e.url} <ExternalLink size={14} aria-hidden="true" />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          )}
        </div>
      )}
    </li>
  )
}

/** « Besoin d'aide ? » : numéros d'urgence, lignes d'écoute et sites fiables. Accessible sans être connecté. */
export default function HelpPage() {
  const navigate = useNavigate()
  const isEmployee = useAuth((s) => s.profile?.role === 'employee')

  return (
    <Screen tabBar={isEmployee}>
      {isEmployee ? (
        <AppHeader />
      ) : (
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="mb-6 inline-flex items-center gap-1 self-start rounded text-sm text-gray-500 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-brand-600">
          <ArrowLeft size={16} aria-hidden="true" /> Retour
        </button>
      )}

      <span className="flex size-12 items-center justify-center rounded-lg bg-white text-brand-700">
        <LifeBuoy size={24} aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">Besoin d'aide ?</h1>
      <p className="mt-2 text-gray-600">
        Tu n'as pas à traverser ça seul·e. Ces services sont gratuits et confidentiels, et rien de ce que tu fais ici n'est transmis à ton entreprise.
      </p>

      <div className="mt-6 space-y-4">
        {HELP_SECTIONS.map((s) => {
          const urgent = s.id === 'urgence'
          return (
            <section
              key={s.id}
              aria-labelledby={`help-${s.id}`}
              className={`rounded-2xl p-5 ring-1 ${urgent ? 'bg-red-50 ring-red-100' : 'bg-white ring-gray-200'}`}
            >
              <h2 id={`help-${s.id}`} className={`text-lg font-semibold tracking-tight ${urgent ? 'text-red-800' : 'text-gray-900'}`}>{s.title}</h2>
              {s.intro && <p className={`mt-1 text-sm ${urgent ? 'text-red-800' : 'text-gray-600'}`}>{s.intro}</p>}
              <ul className={`mt-4 divide-y ${urgent ? 'divide-red-100' : 'divide-gray-100'}`}>
                {s.entries.map((e) => <Entry key={e.name} e={e} urgent={urgent} />)}
              </ul>
            </section>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Numéros et horaires vérifiés le {HELP_CHECKED} sur{' '}
        <a href={HELP_SOURCE.url} target="_blank" rel="noreferrer" className="underline hover:text-gray-700">{HELP_SOURCE.label}</a>, le site du ministère de la Santé.
      </p>
    </Screen>
  )
}
