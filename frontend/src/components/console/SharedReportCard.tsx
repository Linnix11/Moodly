import { Check } from 'lucide-react'
import { useState } from 'react'
import type { SharedReport } from '../../api/types'
import { REPORT_QUESTIONS, reportChoiceLabel } from '../../lib/constants'
import { frDate } from '../../lib/date'
import { ErrorBox } from './ConsoleUi'
import { secondaryButton } from './styles'

/** Un questionnaire partagé : les 5 réponses, le commentaire, et « Marquer comme traité ». */
export function SharedReportCard({ report, onHandled }: { report: SharedReport; onHandled: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handle = async () => {
    setBusy(true)
    setError(null)
    try {
      await onHandled()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className={`rounded-2xl p-4 ring-1 ${report.traitee ? 'bg-gray-50 ring-gray-200' : 'bg-white ring-gray-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-gray-900">{frDate(report.report_date)}</p>
        {report.traitee ? (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700"><Check size={14} aria-hidden="true" /> Traité</span>
        ) : (
          <button type="button" disabled={busy} onClick={handle} className={secondaryButton}>
            {busy ? 'Enregistrement…' : 'Marquer comme traité'}
          </button>
        )}
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {REPORT_QUESTIONS.map((q, qi) => (
          <div key={q.label} className="min-w-0">
            <dt className="text-xs text-gray-500">{q.label}</dt>
            <dd className="font-medium text-gray-900">{report.answers[qi] ? reportChoiceLabel(qi, report.answers[qi]) : '–'}</dd>
          </div>
        ))}
      </dl>
      {report.commentaire && (
        <blockquote className="mt-3 rounded-xl bg-wz-pale px-3 py-2 text-sm whitespace-pre-line text-gray-800">{report.commentaire}</blockquote>
      )}
      {error && <ErrorBox message={error} />}
    </li>
  )
}

