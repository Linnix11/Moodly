import { X } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useId, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, select, input:not([disabled])'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  /** Élément à focaliser à l'ouverture (sinon le premier élément focalisable) */
  initialFocus?: RefObject<HTMLElement | null>
  /** Sur grand écran, panneau à droite au lieu d'un panneau qui monte du bas */
  sideOnDesktop?: boolean
}

/**
 * Panneau modal accessible : role="dialog", focus piégé, Échap et clic sur le fond pour fermer,
 * focus rendu à l'élément d'ouverture. À monter uniquement quand il est ouvert.
 */
export function Sheet({ title, onClose, children, initialFocus, sideOnDesktop = false }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const target = initialFocus?.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus()
    return () => opener?.focus()
  }, [initialFocus])

  // Échap ferme ; Tab / Maj+Tab restent dans le panneau
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panelRef.current) return
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center ${sideOnDesktop ? 'lg:items-stretch lg:justify-end' : ''}`} onKeyDown={onKeyDown}>
      <div className="wz-fade-in absolute inset-0 bg-gray-900/35" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`wz-rise relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.5rem)]
          ${sideOnDesktop ? 'lg:max-h-none lg:max-w-lg lg:rounded-none lg:px-8 lg:pt-8' : ''}`}
      >
        <div aria-hidden="true" className={`mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 ${sideOnDesktop ? 'lg:hidden' : ''}`} />
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mt-1 -mr-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
