import { Lock, Plus, RotateCcw, X } from 'lucide-react'
import { type FormEvent, useCallback, useState } from 'react'
import { createTopic, listManagedTopics, setTopicActive } from '../../api/topics'
import type { ManagedTopic } from '../../api/types'
import { useLoader } from '../../lib/useLoader'
import { Card, ErrorBox } from './ConsoleUi'
import { primaryButton } from './styles'

const fieldClass =
  'min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition-colors outline-none hover:border-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-200'

/** Puce d'un sujet : origine (base, entreprise, équipe) et bouton retirer / remettre si modifiable. */
function TopicChip({ t, busy, onToggle }: { t: ManagedTopic; busy: boolean; onToggle: () => void }) {
  return (
    <li className={`inline-flex items-center gap-1.5 rounded-md py-1 pr-1.5 pl-3 text-sm ring-1 ${t.active ? 'bg-white text-gray-900 ring-gray-200' : 'bg-gray-50 text-gray-400 line-through ring-gray-100'}`}>
      {t.label}
      {t.base && <Lock size={12} aria-label="Sujet de base" className="text-gray-400" />}
      {t.modifiable && (
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          aria-label={t.active ? `Retirer « ${t.label} »` : `Remettre « ${t.label} »`}
          title={t.active ? 'Retirer' : 'Remettre'}
          className="rounded-lg p-1 text-gray-400 no-underline hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          {t.active ? <X size={14} /> : <RotateCcw size={14} />}
        </button>
      )}
    </li>
  )
}

/**
 * Gestion des sujets proposés aux salariés.
 * Manager : crée des sujets pour son équipe. RH : crée des sujets pour toute l'entreprise et peut retirer ceux des équipes.
 * Un sujet n'est jamais supprimé (l'historique le cite) : il est retiré, et peut être remis.
 */
export function TopicManager({ isRh }: { isRh: boolean }) {
  const { data: topics, error, loading, reload } = useLoader(useCallback(() => listManagedTopics(), []))
  const [label, setLabel] = useState('')
  const [busyId, setBusyId] = useState<number | 'new' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const run = async (id: number | 'new', op: () => Promise<void>, after?: () => void) => {
    setBusyId(id)
    setActionError(null)
    try {
      await op()
      after?.()
      reload()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    void run('new', () => createTopic(label), () => setLabel(''))
  }

  const groups: { title: string; items: ManagedTopic[] }[] = topics
    ? [
        { title: 'Sujets de base', items: topics.filter((t) => t.base) },
        { title: "Sujets de l'entreprise", items: topics.filter((t) => !t.base && t.equipe === null) },
        ...(isRh
          ? [...new Set(topics.filter((t) => t.equipe).map((t) => t.equipe as string))].map((eq) => ({
              title: `Équipe : ${eq}`,
              items: topics.filter((t) => t.equipe === eq),
            }))
          : [{ title: 'Sujets de mon équipe', items: topics.filter((t) => t.equipe !== null) }]),
      ]
    : []

  return (
    <Card title="Gérer les sujets" className="mt-4">
      <p className="text-sm text-gray-600">
        {isRh
          ? "Les sujets que vous créez sont proposés à tous les salariés, en plus des sujets de base."
          : "Les sujets que vous créez sont proposés aux salariés de votre équipe uniquement, en plus des sujets de base et de l'entreprise."}
        {' '}Préférez des thèmes larges : un sujet que seule une personne peut choisir risquerait de la faire reconnaître.
      </p>

      <form onSubmit={onCreate} className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="new-topic" className="sr-only">Nouveau sujet</label>
        <input
          id="new-topic"
          value={label}
          maxLength={40}
          onChange={(e) => { setLabel(e.target.value); setActionError(null) }}
          placeholder={isRh ? 'Ex. : Télétravail' : 'Ex. : Outils et logiciels'}
          className={fieldClass}
        />
        <button type="submit" disabled={busyId === 'new' || label.trim().length < 2} className={primaryButton}>
          <Plus size={16} aria-hidden="true" /> {busyId === 'new' ? 'Création…' : 'Créer le sujet'}
        </button>
      </form>

      {(error || actionError) && <ErrorBox message={(actionError ?? error) as string} onRetry={error ? reload : undefined} />}
      {!topics && loading && <div className="mt-4 h-24 animate-pulse rounded-xl bg-gray-100" />}

      <div className="mt-5 space-y-4">
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 text-xs font-semibold text-gray-500">{g.title}</h3>
            {g.items.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun pour l'instant.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {g.items.map((t) => (
                  <TopicChip key={t.id} t={t} busy={busyId === t.id} onToggle={() => run(t.id, () => setTopicActive(t.id, !t.active))} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
