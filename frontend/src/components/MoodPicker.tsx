import { MOODS } from '../lib/constants'
import { MOOD_BAR } from '../lib/theme'

interface Props {
  value: number | null
  onChange: (score: number) => void
}

/** Hauteur de chaque barre : l'échelle monte comme un indicateur de niveau. */
const HEIGHTS = ['h-14', 'h-18', 'h-22', 'h-26', 'h-30']

/** Échelle de 5 barres, du bleu profond (très mal) au vert sauge (très bien). Un seul choix possible. */
export function MoodPicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Ton humeur du jour" className="grid grid-cols-5 items-end gap-2">
      {MOODS.map((m, i) => {
        const selected = value === m.score
        const dimmed = value !== null && !selected
        return (
          <button
            key={m.score}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${m.score} sur 5 : ${m.label}`}
            onClick={() => onChange(m.score)}
            className="group flex min-w-0 flex-col items-stretch gap-2 rounded-lg pt-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
          >
            <span
              aria-hidden="true"
              className={`${HEIGHTS[i]} rounded-md ${MOOD_BAR[m.score]} transition-[opacity,transform] duration-200 ease-(--ease-out)
                group-hover:-translate-y-0.5 group-active:translate-y-0
                ${dimmed ? 'opacity-25' : ''}
                ${selected ? 'ring-2 ring-gray-900 ring-offset-2 ring-offset-wz-pale' : ''}`}
            />
            <span className={`font-display text-xl leading-none ${selected ? 'text-gray-900' : 'text-gray-500'}`}>{m.score}</span>
            <span className={`min-h-[2lh] text-center text-[11px] leading-tight ${selected ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
              {m.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
