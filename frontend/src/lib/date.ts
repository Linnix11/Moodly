const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

/** Date relative en français : « à l'instant », « il y a 3 heures », « hier », « il y a 2 jours »… */
export function formatRelative(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24 && date.getDate() === now.getDate()) return rtf.format(-hours, 'hour')

  // Au-delà : on compte en jours calendaires (hier = la veille, même à 23 h)
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (days < 30) return rtf.format(-days, 'day')
  return `le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

/** Date locale de l'appareil au format YYYY-MM-DD (pour le journal privé). */
export function localISO(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Nombre avec virgule française : 3.4 -> « 3,4 ». */
export function formatDecimal(n: number, digits = 1): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** « 12/10/2026 » */
export const frDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
