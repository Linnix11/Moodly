import { ArrowLeft, Lock } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AccessibilitySettings } from '../components/AccessibilitySettings'

/** Aperçu en direct : un extrait de l'app (question, texte, bouton, lien, chiffre) qui suit les réglages. */
function Preview() {
  return (
    <section aria-labelledby="preview-title" className="rounded-2xl bg-white p-5 lg:p-6">
      <h2 id="preview-title" className="text-xs font-medium text-gray-500">Aperçu</h2>
      <p className="mt-3 font-display text-3xl leading-[1.1] font-medium text-gray-900">Comment te sens-tu aujourd'hui ?</p>
      <p className="mt-3 text-gray-600">
        Ta réponse est anonyme. Ton manager ne voit qu'une moyenne d'équipe, et seulement à partir de 3 réponses.
      </p>
      <dl className="mt-5 flex items-end gap-6 border-t border-gray-200 pt-4">
        <div>
          <dt className="text-xs font-medium text-gray-500">Moyenne de l'équipe</dt>
          <dd className="mt-1 font-display text-3xl font-medium text-gray-900 tabular-nums">3,6<span className="font-sans text-sm font-normal text-gray-500"> /5</span></dd>
        </div>
        <Link to="/aide" className="mb-1 text-sm font-medium text-brand-700 hover:underline">Besoin d'aide ?</Link>
      </dl>
      <div aria-hidden="true" className="mt-5 w-full rounded-lg bg-brand-700 py-3.5 text-center font-semibold text-white">
        Envoyer mon humeur
      </div>
    </section>
  )
}

/** Page « Accessibilité » : réglages d'affichage, accessibles sans être connecté. */
export default function AccessibilityPage() {
  const navigate = useNavigate()
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  useEffect(() => {
    document.title = 'Accessibilité · WorkZen'
    window.scrollTo(0, 0)
  }, [])

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-16 lg:px-10 lg:pt-12">
      <button
        type="button"
        onClick={back}
        className="inline-flex items-center gap-1 rounded text-sm text-gray-500 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Retour
      </button>

      <h1 className="mt-6 font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900 lg:text-5xl">Accessibilité</h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        Adapte l'affichage à tes besoins. Les changements s'appliquent tout de suite, sur toutes les pages.
      </p>
      <p className="mt-2 flex max-w-2xl items-start gap-1.5 text-sm text-gray-500">
        <Lock size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
        Ces réglages restent sur cet appareil : ni l'entreprise ni WorkZen n'y ont accès.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
        <section aria-label="Réglages" className="rounded-2xl bg-white p-5 lg:p-6">
          <AccessibilitySettings />
        </section>
        <div className="lg:sticky lg:top-8">
          <Preview />
        </div>
      </div>
    </main>
  )
}
