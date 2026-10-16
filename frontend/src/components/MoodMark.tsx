import { MOOD_BAR } from '../lib/theme'

/** Petit repère de couleur pour une humeur (1 à 5), placé avant son libellé. */
export function MoodMark({ score, className = '' }: { score: number; className?: string }) {
  const s = Math.min(5, Math.max(1, Math.round(score)))
  return <span aria-hidden="true" className={`inline-block h-3.5 w-1.5 shrink-0 rounded-sm align-[-2px] ${MOOD_BAR[s]} ${className}`} />
}
