import { Accessibility } from 'lucide-react'
import { Link } from 'react-router-dom'
import { activeCount, useA11y } from '../lib/a11y'

/**
 * Bouton « Accessibilité » : ouvre la page des réglages (/accessibilite). Une pastille indique combien de réglages sont actifs.
 * tone="dark" pour le menu bleu profond de la console ; withLabel pour afficher le mot à côté de l'icône.
 */
export function AccessibilityButton({ tone = 'light', withLabel = false, className = '' }: { tone?: 'light' | 'dark'; withLabel?: boolean; className?: string }) {
  const count = useA11y((s) => activeCount(s.settings))
  const colors = tone === 'dark'
    ? 'text-brand-100 hover:bg-white/10 hover:text-white focus-visible:outline-white'
    : 'text-gray-600 hover:bg-white hover:text-gray-900 focus-visible:outline-brand-600'
  return (
    <>
      <Link
        to="/accessibilite"
        aria-label={withLabel ? undefined : `Accessibilité${count ? ` (${count} réglage${count > 1 ? 's' : ''} actif${count > 1 ? 's' : ''})` : ''}`}
        title="Accessibilité"
        className={`relative inline-flex items-center gap-2 rounded-lg p-2.5 text-sm font-medium transition-colors focus-visible:outline-2 ${colors} ${className}`}
      >
        <Accessibility size={20} aria-hidden="true" />
        {withLabel && <span>Accessibilité{count > 0 && <span className="sr-only"> ({count} actif{count > 1 ? 's' : ''})</span>}</span>}
        {withLabel && count > 0 && (
          <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-brand-700 text-[0.6875rem] leading-none font-bold text-white ring-2 ring-white">
            {count}
          </span>
        )}
        {!withLabel && count > 0 && (
          <span aria-hidden="true" className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-brand-700 text-[0.625rem] leading-none font-bold text-white ring-2 ring-white">
            {count}
          </span>
        )}
      </Link>
    </>
  )
}
