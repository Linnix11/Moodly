import { Check } from 'lucide-react'
import { useState } from 'react'
import type { ContactRequest } from '../api/types'
import { localISO } from '../lib/date'

const PREFERENCE = { en_personne: 'en personne', message: 'par message' } as const

/** « cette semaine », « la semaine dernière », « semaine du 05/10 » : jamais le jour exact. */
function weekLabel(monday: string): string {
  const now = new Date(localISO())
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const diff = Math.round((thisMonday.getTime() - new Date(monday).getTime()) / (7 * 86_400_000))
  if (diff <= 0) return 'cette semaine'
  if (diff === 1) return 'la semaine dernière'
  return `semaine du ${monday.slice(8, 10)}/${monday.slice(5, 7)}`
}

interface Props {
  requests: ContactRequest[]
  onHandled: (id: number) => Promise<void>
  showTeam?: boolean
}

/** Demandes d'échange (A1) : un nom, un sujet facultatif, une semaine. Jamais de note ni de date exacte. */
export function ContactRequestList({ requests, onHandled, showTeam = false }: Props) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (requests.length === 0) {
    return <p className="rounded-2xl bg-white p-4 text-sm text-gray-500">Aucune demande d'échange pour le moment.</p>
  }

  const handle = async (id: number) => {
    setBusyId(id)
    setError(null)
    try {
      await onHandled(id)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.id} className={`rounded-2xl p-4 ring-1 ${r.traitee ? 'bg-gray-50 ring-gray-100' : 'bg-white ring-gray-200'}`}>
            <p className={`text-sm ${r.traitee ? 'text-gray-500' : 'text-gray-900'}`}>
              <strong>{r.nom}</strong> souhaite échanger
              {r.tag && <> · Sujet : {r.tag}</>}
              {' · '}<strong>{weekLabel(r.semaine)}</strong>
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <span>Préfère {PREFERENCE[r.preference]}{showTeam && r.equipe && <> · {r.equipe}</>}</span>
              {r.traitee ? (
                <span className="inline-flex items-center gap-1 text-emerald-700"><Check size={14} aria-hidden="true" /> Traitée</span>
              ) : (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => handle(r.id)}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  Marquer comme traité
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
