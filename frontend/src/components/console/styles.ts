/** Constantes partagées par les pages de la console. */

export const PERIODS = [30, 90, 180] as const

/** Bouton secondaire (blanc) de la console. */
export const secondaryButton =
  'inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 active:translate-y-px disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600'

export const primaryButton =
  'inline-flex items-center gap-2 rounded-lg bg-brand-700 active:translate-y-px px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:bg-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
