import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { TeamOverview } from '../../components/console/TeamOverview'

/** Console RH : vue d'une équipe en lecture seule (aucun rapport nominatif). */
export default function TeamDetailPage() {
  const teamId = Number(useParams().teamId)
  return (
    <>
      <Link to="/console" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} aria-hidden="true" /> Entreprise
      </Link>
      {Number.isInteger(teamId) ? <TeamOverview key={teamId} teamId={teamId} readOnly /> : <p>Équipe introuvable.</p>}
    </>
  )
}
