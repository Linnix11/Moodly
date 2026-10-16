import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { LegalLinks } from '../components/LegalLinks'
import { useAuth } from '../store/authStore'

const field =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base transition-colors outline-none hover:border-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-200'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, session, profile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // On attend aussi le profil : sinon "/" renvoie vers /login pendant son chargement (boucle)
  if (session && profile) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="flex flex-col bg-wz-navy px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-8 text-white lg:px-14 lg:py-12">
        <p className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white"><img src="/logo.png" alt="" className="h-7 w-auto" /></span>
          WorkZen
        </p>
        <div className="mt-10 lg:mt-auto">
          <h1 className="font-display max-w-md text-[2.125rem] leading-[1.1] font-medium lg:text-5xl">
            Le moral de l'équipe, en 10 secondes par jour.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-100">
            Anonyme par conception : ton manager ne voit qu'une moyenne d'équipe, jamais ta réponse.
          </p>
        </div>
        <p className="mt-8 hidden text-xs text-brand-200 lg:mt-auto lg:block">Projet MOODLY</p>
      </aside>

      <main className="mx-auto flex w-full max-w-md flex-col px-5 py-10 pb-[max(env(safe-area-inset-bottom),2rem)] lg:justify-center lg:py-12">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">Se connecter</h2>
        <p className="mt-1 text-sm text-gray-500">Avec l'adresse fournie par ton entreprise.</p>

        <form onSubmit={onSubmit} className="wz-fade-in mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Email professionnel</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              className={field}
              placeholder="prenom.nom@entreprise.fr"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              className={field}
            />
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-700 py-3.5 font-semibold text-white transition hover:bg-brand-800 active:translate-y-px disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-10 border-t border-gray-200 pt-6">
          <Link to="/aide" className="text-sm font-medium text-brand-700 hover:underline">Besoin d'aide ? Numéros utiles</Link>
          <LegalLinks className="mt-4" />
          <p className="mt-4 text-xs text-gray-500 lg:hidden">Projet MOODLY</p>
        </div>
      </main>
    </div>
  )
}
