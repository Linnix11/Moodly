import { ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Screen, Spinner } from '../../components/Screen'
import { needsTermsAcceptance, useAuth } from '../../store/authStore'
import { AccessibilityButton } from '../../components/AccessibilityButton'

/** Première connexion (ou CGU mises à jour) : acceptation obligatoire avant d'utiliser l'app. */
export default function AcceptTerms() {
  const navigate = useNavigate()
  const { session, profile, loading, acceptTerms, signOut } = useAuth()
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <Spinner />
  if (!session || !profile) return <Navigate to="/login" replace />
  if (!needsTermsAcceptance(profile)) return <Navigate to="/" replace />

  const isUpdate = profile.terms_version !== null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await acceptTerms()
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Screen>
      <div className="flex justify-end">
        <AccessibilityButton withLabel className="-mr-2.5" />
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-wz-mint text-brand-700">
          <ShieldCheck size={30} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-center font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">
          {isUpdate ? 'Nos conditions ont changé' : 'Bienvenue sur WorkZen'}
        </h1>
        <p className="mt-3 text-center text-gray-600">
          Avant de continuer, prends connaissance des règles d'utilisation et de la façon dont tes données sont protégées.
        </p>

        <ul className="mt-6 space-y-2 rounded-2xl bg-white p-5 text-sm text-gray-700">
          <li>Par défaut, ton humeur et tes avis ne sont jamais rattachés à ton nom : c'est toi qui décides de les partager.</li>
          <li>Aucune statistique n'est affichée sous 3 réponses.</li>
          <li>Ton journal reste sur ton appareil.</li>
        </ul>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              required
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 rounded border-gray-300 accent-brand-700"
            />
            <span>
              J'ai lu et j'accepte les{' '}
              <Link to="/legal/cgu" className="font-medium text-brand-700 underline">conditions générales d'utilisation</Link>,
              et j'ai pris connaissance de la{' '}
              <Link to="/legal/confidentialite" className="font-medium text-brand-700 underline">politique de confidentialité</Link>.
            </span>
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={!checked || busy}
            className="w-full rounded-lg bg-brand-700 active:translate-y-px py-3.5 font-semibold text-white transition hover:bg-brand-800 disabled:bg-gray-300"
          >
            {busy ? 'Enregistrement…' : 'Accepter et continuer'}
          </button>
          <button type="button" onClick={signOut} className="w-full py-2 text-sm text-gray-500 hover:text-gray-800">
            Refuser et se déconnecter
          </button>
        </form>
      </div>
    </Screen>
  )
}
