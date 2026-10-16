import { useEffect, useState } from 'react'
import { getMySharedReports } from '../api/sharedReports'
import type { MySharedReport } from '../api/types'

const frDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

/** Transparence : les questionnaires que le salarié a partagés avec son nom. N'affiche rien s'il n'y en a pas. */
export function MySharedReports() {
  const [reports, setReports] = useState<MySharedReport[]>([])

  useEffect(() => {
    getMySharedReports().then(setReports, () => setReports([]))
  }, [])

  if (reports.length === 0) return null
  return (
    <section aria-labelledby="my-shared-title" className="mt-8 rounded-2xl bg-white p-5">
      <h2 id="my-shared-title" className="font-semibold text-gray-900">Ce que tu as partagé avec ton nom</h2>
      <p className="mt-1 text-sm text-gray-600">Questionnaires où tu as choisi d'en parler à ton manager ou aux RH.</p>
      <ul className="mt-3 divide-y divide-gray-100 text-sm">
        {reports.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2">
            <span className="text-gray-900">{frDate(r.report_date)} · {r.destinataire === 'rh' ? 'aux RH' : 'à ton manager'}</span>
            <span className={r.traitee ? 'text-emerald-700' : 'text-gray-500'}>{r.traitee ? 'Pris en compte' : 'Envoyé'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
