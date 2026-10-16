import { TeamOverview } from '../../components/console/TeamOverview'
import { useAuth } from '../../store/authStore'
import CompanyOverview from './CompanyOverview'

/** Accueil de la console : vue entreprise pour la RH, vue de son équipe pour le manager. */
export default function ConsoleHome() {
  const role = useAuth((s) => s.profile?.role)
  return role === 'rh' ? <CompanyOverview /> : <TeamOverview teamId={null} />
}
