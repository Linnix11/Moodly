import { Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTeamPulse } from '../api/team'

/** « Tu es la 4ᵉ réponse de l'équipe aujourd'hui » (nombre de réponses seulement, jamais de moyenne). */
export function TeamCountLine() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    getTeamPulse().then((p) => setCount(p.aujourdhui_nb_reponses), () => setCount(null))
  }, [])

  if (!count) return null
  return (
    <p className="text-sm text-gray-600">
      <Users size={14} aria-hidden="true" className="mr-1 inline align-[-2px]" />
      Tu es la {count}{count === 1 ? 'ʳᵉ' : 'ᵉ'} réponse de l'équipe aujourd'hui.{' '}
      <Link to="/team" className="font-semibold text-brand-700 hover:underline">Voir l'équipe</Link>
    </p>
  )
}
