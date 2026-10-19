import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Fragment, type ReactNode, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LEGAL_DOCS, LEGAL_UPDATED, legalDoc } from '../../lib/legal'
import { AccessibilityButton } from '../../components/AccessibilityButton'

/** Surligne les passages « [À COMPLÉTER : …] » pour qu'ils sautent aux yeux tant qu'ils ne sont pas remplis. */
function withPlaceholders(text: string): ReactNode {
  return text.split(/(\[À COMPLÉTER[^\]]*\])/).map((part, i) =>
    part.startsWith('[À COMPLÉTER') ? <mark key={i} className="rounded bg-amber-100 px-1 text-amber-900">{part}</mark> : <Fragment key={i}>{part}</Fragment>,
  )
}

/** Paragraphes ; les lignes « - … » consécutives deviennent une liste. */
function Body({ lines }: { lines: string[] }) {
  const blocks: (string | string[])[] = []
  for (const line of lines) {
    if (line.startsWith('- ')) {
      const last = blocks[blocks.length - 1]
      if (Array.isArray(last)) last.push(line.slice(2))
      else blocks.push([line.slice(2)])
    } else {
      blocks.push(line)
    }
  }
  return (
    <>
      {blocks.map((b, i) => Array.isArray(b) ? (
        <ul key={i} className="list-disc space-y-1 pl-5">
          {b.map((item, j) => <li key={j}>{withPlaceholders(item)}</li>)}
        </ul>
      ) : (
        <p key={i}>{withPlaceholders(b)}</p>
      ))}
    </>
  )
}

/** Pages légales publiques : /legal (sommaire) et /legal/:slug (un document). */
export default function LegalPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const doc = legalDoc(slug)

  useEffect(() => {
    document.title = doc ? `${doc.title} · WorkZen` : 'Informations légales · WorkZen'
    window.scrollTo(0, 0)
  }, [doc])

  // Retour à la page d'avant si on vient de l'app, sinon à l'accueil
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-16 lg:pt-12">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded text-sm text-gray-500 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-brand-600">
          <ArrowLeft size={16} aria-hidden="true" /> Retour
        </button>
        <AccessibilityButton className="-mr-2.5" />
      </div>

      {slug && !doc ? (
        <p className="mt-8 text-gray-700">Document introuvable. <Link to="/legal" className="text-brand-700 underline">Voir tous les documents</Link></p>
      ) : !doc ? (
        <>
          <h1 className="mt-6 font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">Informations légales</h1>
          <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : {LEGAL_UPDATED}</p>
          <ul className="mt-8 divide-y divide-gray-100 rounded-2xl bg-white">
            {LEGAL_DOCS.map((d) => (
              <li key={d.slug}>
                <Link to={`/legal/${d.slug}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-600">
                  <span>
                    <span className="block font-semibold text-gray-900">{d.title}</span>
                    <span className="block text-sm text-gray-500">{d.summary}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <article>
          <h1 className="mt-6 font-display text-[2.125rem] leading-[1.1] font-medium text-gray-900">{doc.title}</h1>
          <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : {LEGAL_UPDATED}</p>
          <div className="mt-8 space-y-8">
            {doc.sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold text-gray-900">{s.title}</h2>
                <div className="mt-2 space-y-3 leading-relaxed text-gray-700">
                  <Body lines={s.body} />
                </div>
              </section>
            ))}
          </div>
          <nav aria-label="Autres documents" className="mt-12 border-t border-gray-200 pt-6">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {LEGAL_DOCS.filter((d) => d.slug !== doc.slug).map((d) => (
                <li key={d.slug}><Link to={`/legal/${d.slug}`} className="text-brand-700 hover:underline">{d.title}</Link></li>
              ))}
            </ul>
          </nav>
        </article>
      )}
    </main>
  )
}
