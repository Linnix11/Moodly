import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMySharing, setShareWithManager } from '../api/sharing'

/**
 * « Mon manager peut voir mes réponses » : accord du salarié, désactivé par défaut.
 * Activer et retirer passent tous deux par une confirmation explicite (le retrait supprime ce qui a été partagé).
 */
export function SharingCard() {
  const [actif, setActif] = useState<boolean | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMySharing().then((s) => setActif(s.actif), () => setActif(null))
  }, [])

  if (actif === null) return null

  const apply = async () => {
    setBusy(true)
    setError(null)
    try {
      await setShareWithManager(!actif)
      setActif(!actif)
      setConfirming(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="sharing-title" className="mt-8 rounded-2xl bg-white p-5">
      <div className="flex items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${actif ? 'bg-wz-mint text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
          {actif ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="sharing-title" className="font-semibold text-gray-900">Partager mes réponses avec mon manager</h2>
          <p className="mt-1 text-sm text-gray-600">
            {actif
              ? 'Activé : ton manager voit, avec ton nom, ta note du jour, tes sujets et tes questionnaires.'
              : 'Désactivé : tes réponses restent anonymes. Ton manager ne voit que des moyennes d\'équipe.'}
          </p>
        </div>
      </div>

      {confirming ? (
        <div role="group" aria-label="Confirmer" className={`mt-4 rounded-xl p-3 text-sm ${actif ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'}`}>
          <p>
            {actif
              ? "Arrêter le partage ? Ton manager ne verra plus tes réponses, et tout ce qui a été partagé grâce à cette option sera supprimé."
              : "À partir de maintenant, ton manager verra avec ton nom ta note d'humeur de chaque jour, les sujets choisis et tes questionnaires. Les réponses déjà envoyées restent anonymes. Tu peux arrêter quand tu veux."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={apply}
              className={`rounded-lg px-4 py-2 font-semibold text-white active:translate-y-px disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 ${actif ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600' : 'bg-brand-700 hover:bg-brand-800 focus-visible:outline-brand-600'}`}
            >
              {busy ? 'Enregistrement…' : actif ? 'Arrêter et supprimer' : 'Oui, partager'}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-lg px-4 py-2 font-medium text-gray-700 hover:bg-white">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 active:translate-y-px focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          {actif ? 'Arrêter le partage' : 'Activer le partage'}
        </button>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </section>
  )
}
