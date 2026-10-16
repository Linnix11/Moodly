import type { DayStat } from '../api/types'

/** Télécharge les stats agrégées en CSV (séparateur « ; » et BOM pour Excel en français). */
export function downloadStatsCsv(stats: DayStat[], fileName: string): void {
  const escape = (v: string) => (/[;"\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)
  const rows = [
    ['jour', 'moyenne', 'nb_reponses', 'sujets_principaux'],
    ...stats.map((d) => [
      d.jour,
      d.moyenne === null ? '' : d.moyenne.toFixed(2).replace('.', ','),
      String(d.nb_reponses),
      d.top_tags.join(' / '),
    ]),
  ]
  const csv = '﻿' + rows.map((r) => r.map(escape).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName })
  link.click()
  URL.revokeObjectURL(url)
}
