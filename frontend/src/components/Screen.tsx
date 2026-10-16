import type { ReactNode } from 'react'
import { TabBar } from './TabBar'

/**
 * Conteneur de page mobile : largeur max, marges, zones sûres (encoche, barre de navigation).
 * tabBar : affiche la barre d'onglets employé et laisse la place en bas pour qu'elle ne cache rien.
 */
export function Screen({ children, tabBar = false }: { children: ReactNode; tabBar?: boolean }) {
  return (
    <>
      <main
        className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[max(env(safe-area-inset-top),1.5rem)] ${
          tabBar ? 'pb-[calc(env(safe-area-inset-bottom)+5.5rem)]' : 'pb-[max(env(safe-area-inset-bottom),1.5rem)]'
        }`}
      >
        {children}
      </main>
      {tabBar && <TabBar />}
    </>
  )
}

export function Spinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Chargement">
      <div className="size-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
    </div>
  )
}
