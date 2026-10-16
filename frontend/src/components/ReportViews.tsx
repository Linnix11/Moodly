import type { ReportSummaryRow } from '../api/types'
import { ANONYMITY_THRESHOLD, REPORT_QUESTIONS, reportChoiceLabel } from '../lib/constants'
import { anonymousTotal } from '../lib/stats'

/** Réponses des questionnaires anonymes, agrégées (rien sous 3 rapports). */
export function AnonymousTrends({ summary, periodLabel = '30 jours', grid = false }: {
  summary: ReportSummaryRow[]
  periodLabel?: string
  grid?: boolean
}) {
  const total = anonymousTotal(summary)
  if (total === 0) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm text-gray-500">
        Pas assez de rapports anonymes pour les afficher (il en faut au moins {ANONYMITY_THRESHOLD} sur {periodLabel}, pour protéger l'anonymat).
      </p>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{total} rapports anonymes sur la période</p>
      <div className={grid ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
        {REPORT_QUESTIONS.map((q, qi) => (
          <section key={q.label} className="rounded-2xl bg-white p-4">
            <h3 className="text-sm font-medium text-gray-700">{q.label}</h3>
            <ul className="mt-2 space-y-1.5">
              {summary.filter((s) => s.question === qi + 1).map((s) => (
                <li key={s.answer} className="text-sm">
                  <div className="flex justify-between text-gray-900">
                    <span>{reportChoiceLabel(qi, s.answer)}</span>
                    <span className="font-semibold">{s.nb}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(s.nb / total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

/** Commentaires libres des questionnaires : sans date ni réponses associées, dans un ordre aléatoire, rien sous 3. */
export function AnonymousComments({ comments, periodLabel = '30 jours' }: { comments: string[]; periodLabel?: string }) {
  if (comments.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm text-gray-500">
        Pas assez de commentaires pour les afficher (il en faut au moins {ANONYMITY_THRESHOLD} sur {periodLabel}, pour protéger l'anonymat).
      </p>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{comments.length} commentaire{comments.length > 1 ? 's' : ''} anonyme{comments.length > 1 ? 's' : ''}, sans date et dans le désordre</p>
      <ul className="space-y-2">
        {comments.map((c, i) => (
          <li key={i} className="rounded-2xl bg-white px-4 py-3 text-sm whitespace-pre-line text-gray-800">{c}</li>
        ))}
      </ul>
    </div>
  )
}
