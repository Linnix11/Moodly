/**
 * Couleurs de la charte pour ce qui ne passe pas par Tailwind (graphiques SVG).
 * Mêmes valeurs que les tokens --color-wz-* de index.css : ne pas les modifier ici seulement.
 */
export const CHARTER = {
  navy: '#123b63',
  teal: '#21a6a6',
  sage: '#8bc9a3',
  mint: '#ddf3e9',
  pale: '#eaf5f8',
  white: '#ffffff',
} as const

/** Teintes dérivées utilisées par les graphiques (gray-200 / gray-500 de index.css). */
export const CHART = {
  grid: CHARTER.pale,
  axis: '#5e7288',
  reference: '#c7d3de',
  line: CHARTER.teal,
  marker: CHARTER.navy,
} as const

/** Couleur de chaque humeur (1 à 5) : classes Tailwind écrites en entier pour que le build les garde. */
export const MOOD_BAR: Record<number, string> = {
  1: 'bg-mood-1',
  2: 'bg-mood-2',
  3: 'bg-mood-3',
  4: 'bg-mood-4',
  5: 'bg-mood-5',
}

/** Mêmes couleurs, pour les graphiques SVG. */
export const MOOD_HEX = ['#123b63', '#145b6f', '#167b7b', '#21a6a6', '#8bc9a3'] as const
