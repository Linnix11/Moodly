import { MANAGER_GUIDES, type Tag } from '../lib/constants'
import { Sheet } from './Sheet'

/** Fiche conseil d'un sujet (B5), dans un panneau latéral sur grand écran. */
export function GuideSheet({ tag, onClose }: { tag: Tag; onClose: () => void }) {
  return (
    <Sheet title={MANAGER_GUIDES[tag].titre} onClose={onClose} sideOnDesktop>
      <GuideContent tag={tag} />
    </Sheet>
  )
}

/** Contenu d'une fiche : 5 étapes + 2 erreurs à éviter (réutilisé par la page Ressources). */
export function GuideContent({ tag }: { tag: Tag }) {
  const guide = MANAGER_GUIDES[tag]
  return (
    <>
      <p className="mt-1 text-sm text-gray-500">Sujet : {tag}</p>
      <h3 className="mt-5 text-sm font-semibold text-gray-900">Étapes</h3>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-gray-700">
        {guide.etapes.map((e) => <li key={e}>{e}</li>)}
      </ol>
      <h3 className="mt-5 text-sm font-semibold text-gray-900">À éviter</h3>
      <ul className="mt-2 space-y-2 text-sm text-gray-700">
        {guide.aEviter.map((e) => (
          <li key={e} className="flex gap-2"><span aria-hidden="true" className="text-red-600">✕</span>{e}</li>
        ))}
      </ul>
    </>
  )
}
