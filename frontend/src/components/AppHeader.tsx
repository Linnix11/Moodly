import { LogOut, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../store/authStore'

const iconButton =
  'rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-white hover:text-gray-900 active:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-600'

/** En-tête des écrans mobiles : wordmark à gauche, accès légal et déconnexion à droite. */
export function AppHeader({ subtitle }: { subtitle?: string }) {
  const signOut = useAuth((s) => s.signOut)
  return (
    <header className="flex items-center justify-between pb-8">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900">
          <img src="/logo.png" alt="" className="h-7 w-auto" />
          WorkZen
        </p>
        {subtitle && <p className="mt-0.5 truncate text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="-mr-2 flex items-center">
        <Link to="/legal" aria-label="Informations légales et confidentialité" title="Informations légales et confidentialité" className={iconButton}>
          <Scale size={20} />
        </Link>
        <button type="button" onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter" className={iconButton}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  )
}
