import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { ONBOARDING_KEY } from '../lib/constants'
import { writeItem } from '../lib/storage'
import { AccessibilityButton } from '../components/AccessibilityButton'

const points = [
  {
    title: 'Pourquoi WorkZen ?',
    text: "34 % des salariés français se disent en burn-out. WorkZen aide ton équipe à repérer quand ça ne va pas, avant que ça s'aggrave.",
  },
  {
    title: '100 % anonyme',
    text: "Par défaut, ta réponse n'est jamais reliée à ton nom, même dans la base de données. Tu peux choisir de la partager avec ton manager, et arrêter quand tu veux. Ton manager ne voit qu'une moyenne d'équipe, et rien du tout s'il y a moins de 3 réponses dans la journée.",
  },
  {
    title: 'Utile pour tous',
    text: "Ton manager voit la tendance sur 30 jours et les sujets qui reviennent (charge, ambiance…) pour agir concrètement.",
  },
]

/** Écran affiché au premier lancement : explique le « pourquoi » et garantit l'anonymat (incitation à l'usage). */
export default function Onboarding() {
  const navigate = useNavigate()

  const finish = () => {
    writeItem(ONBOARDING_KEY, 'true')
    navigate('/mood', { replace: true })
  }

  return (
    <Screen>
      <div className="mt-4 flex items-center justify-between gap-3">
        <img src="/logo.png" alt="" className="h-10 w-auto" />
        <AccessibilityButton withLabel className="-mr-2.5" />
      </div>
      <h1 className="mt-6 font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">Bienvenue sur WorkZen</h1>
      <p className="mt-2 text-gray-500">Avant de commencer, 3 choses importantes.</p>

      <ol className="wz-fade-in mt-8 flex-1 divide-y divide-gray-200 border-y border-gray-200">
        {points.map(({ title, text }, i) => (
          <li key={title} className="flex gap-4 py-5">
            <span aria-hidden="true" className="font-display w-6 shrink-0 text-3xl leading-none font-medium text-brand-700 tabular-nums">{i + 1}</span>
            <div>
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={finish}
        className="mt-8 w-full rounded-lg bg-brand-700 active:translate-y-px py-3.5 font-semibold text-white transition hover:bg-brand-800"
      >
        J'ai compris, c'est parti
      </button>
    </Screen>
  )
}
