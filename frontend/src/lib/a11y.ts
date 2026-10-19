import { create } from 'zustand'
import { readItem, writeItem } from './storage'

/**
 * Réglages d'accessibilité. Enregistrés UNIQUEMENT dans ce navigateur, jamais envoyés au serveur :
 * un réglage peut révéler un handicap (donnée de santé), l'employeur ne doit pas y avoir accès.
 * Ils s'appliquent via des attributs data-* sur <html>, lus par index.css.
 */
export type TextSize = 'normal' | 'grand' | 'tres-grand'

export interface A11ySettings {
  textSize: TextSize
  contrast: boolean
  dyslexia: boolean
  reduceMotion: boolean
  largeTargets: boolean
}

export const A11Y_DEFAULTS: A11ySettings = {
  textSize: 'normal',
  contrast: false,
  dyslexia: false,
  reduceMotion: false,
  largeTargets: false,
}

const KEY = 'wz_a11y'

function load(): A11ySettings {
  try {
    const raw = readItem(KEY)
    return raw ? { ...A11Y_DEFAULTS, ...(JSON.parse(raw) as Partial<A11ySettings>) } : A11Y_DEFAULTS
  } catch {
    return A11Y_DEFAULTS
  }
}

/** Reporte les réglages sur <html> (appelé au démarrage, avant le premier rendu, puis à chaque changement). */
export function applyA11y(s: A11ySettings) {
  const html = document.documentElement
  const set = (name: string, on: boolean) => {
    if (on) html.setAttribute(name, '')
    else html.removeAttribute(name)
  }
  html.dataset.text = s.textSize
  set('data-contrast', s.contrast)
  set('data-dyslexia', s.dyslexia)
  set('data-reduce-motion', s.reduceMotion)
  set('data-large-targets', s.largeTargets)
}

interface A11yState {
  settings: A11ySettings
  update: (patch: Partial<A11ySettings>) => void
  reset: () => void
}

export const useA11y = create<A11yState>((setState, get) => {
  const save = (settings: A11ySettings) => {
    writeItem(KEY, JSON.stringify(settings))
    applyA11y(settings)
    setState({ settings })
  }
  return {
    settings: load(),
    update: (patch) => save({ ...get().settings, ...patch }),
    reset: () => save(A11Y_DEFAULTS),
  }
})

/** Nombre de réglages actifs (pastille sur le bouton). */
export const activeCount = (s: A11ySettings) =>
  (s.textSize !== 'normal' ? 1 : 0) + [s.contrast, s.dyslexia, s.reduceMotion, s.largeTargets].filter(Boolean).length
