import { CalendarDays, LifeBuoy, Smile, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/mood', label: "Aujourd'hui", icon: Smile },
  { to: '/team', label: 'Équipe', icon: Users },
  { to: '/journal', label: 'Journal', icon: CalendarDays },
  { to: '/aide', label: 'Aide', icon: LifeBuoy },
]

/** Barre d'onglets fixe en bas de l'écran, pour les pages employé. L'onglet actif porte un trait turquoise en haut. */
export function TabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 px-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 pt-2.5 pb-2.5 text-xs whitespace-nowrap transition-colors
                 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600
                 ${isActive ? 'font-semibold text-gray-900' : 'font-medium text-gray-500 hover:text-gray-900'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-5 top-0 h-0.5 rounded-b-sm bg-brand-700 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <Icon size={21} aria-hidden="true" strokeWidth={isActive ? 2.25 : 1.75} className={isActive ? 'text-brand-700' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
