import { useId } from 'react'
import { activeCount, type TextSize, useA11y } from '../lib/a11y'

const SIZES: { value: TextSize; label: string; sample: string }[] = [
  { value: 'normal', label: 'Normal', sample: 'text-base' },
  { value: 'grand', label: 'Grand', sample: 'text-lg' },
  { value: 'tres-grand', label: 'Très grand', sample: 'text-xl' },
]

/** Interrupteur accessible (role="switch") avec titre et explication. */
function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p id={`${id}-l`} className="font-medium text-gray-900">{label}</p>
        <p id={`${id}-h`} className="mt-0.5 text-sm text-gray-600">{help}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-h`}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600
          ${checked ? 'bg-brand-700' : 'bg-gray-500'}`}
      >
        <span aria-hidden="true" className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

/** Réglages d'accessibilité : taille du texte, contraste, police lisible, animations, zones cliquables. */
export function AccessibilitySettings() {
  const { settings, update, reset } = useA11y()
  return (
    <>
      <fieldset>
        <legend className="font-medium text-gray-900">Taille du texte</legend>
        <div role="radiogroup" aria-label="Taille du texte" className="mt-2 grid grid-cols-3 gap-2">
          {SIZES.map((s) => {
            const on = settings.textSize === s.value
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => update({ textSize: s.value })}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600
                  ${on ? 'bg-gray-900 font-semibold text-white' : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50'}`}
              >
                <span aria-hidden="true" className={`${s.sample} leading-none font-semibold`}>Aa</span>
                {s.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-2 divide-y divide-gray-200">
        <Toggle
          label="Contraste renforcé"
          help="Texte plus foncé, contours visibles, liens soulignés. Utile en cas de malvoyance ou de daltonisme."
          checked={settings.contrast}
          onChange={(v) => update({ contrast: v })}
        />
        <Toggle
          label="Police facile à lire"
          help="Police Atkinson Hyperlegible et texte plus espacé. Utile en cas de dyslexie ou de fatigue visuelle."
          checked={settings.dyslexia}
          onChange={(v) => update({ dyslexia: v })}
        />
        <Toggle
          label="Réduire les animations"
          help="Supprime les mouvements et les fondus. Utile en cas d'épilepsie, de vertiges ou de troubles de l'attention."
          checked={settings.reduceMotion}
          onChange={(v) => update({ reduceMotion: v })}
        />
        <Toggle
          label="Agrandir les zones cliquables"
          help="Boutons et champs plus grands, plus faciles à toucher. Utile en cas de tremblements ou de troubles moteurs."
          checked={settings.largeTargets}
          onChange={(v) => update({ largeTargets: v })}
        />
      </div>

      <button
        type="button"
        onClick={reset}
        disabled={activeCount(settings) === 0}
        className="mt-4 w-full rounded-lg bg-white py-3 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        Revenir aux réglages par défaut
      </button>
    </>
  )
}
