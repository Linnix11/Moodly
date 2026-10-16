import { Megaphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActions } from '../api/actions'
import type { TeamAction } from '../api/types'
import { formatRelative } from '../lib/date'
import { StatusBadge } from './ActionList'

/** Carte « Ton manager a agi » : la dernière action publiée. N'affiche rien s'il n'y en a pas. */
export function LatestActionCard() {
  const [action, setAction] = useState<TeamAction | null>(null)

  useEffect(() => {
    getActions(1).then((list) => setAction(list[0] ?? null), () => setAction(null))
  }, [])

  if (!action) return null
  return (
    <section className="flex gap-3 rounded-2xl bg-white p-4 text-left">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-wz-pale text-brand-700">
        <Megaphone size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
      <p className="text-sm text-gray-900">
        <strong className="font-semibold">Ton manager a agi :</strong> {action.message}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="flex flex-wrap items-center gap-2">
          <time dateTime={action.created_at} className="text-gray-500">{formatRelative(action.created_at)}</time>
          <StatusBadge action={action} />
        </span>
        <Link to="/team" className="font-semibold whitespace-nowrap text-brand-700 hover:underline">Voir tout</Link>
      </div>
      </div>
    </section>
  )
}
