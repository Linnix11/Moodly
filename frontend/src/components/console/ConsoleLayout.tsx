import { BookOpen, Building, ClipboardList, LayoutDashboard, LogOut, Megaphone, Presentation, Smartphone, Tags, UserCog, UserRound, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/authStore'
import { LegalLinks } from '../LegalLinks'
import { AccessibilityButton } from '../AccessibilityButton'

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }
interface NavGroup { title: string; items: NavItem[] }

/** Menu regroupé par usage : on suit, on agit, on partage. */
const MANAGER_NAV: NavGroup[] = [
  { title: 'Suivi', items: [
    { to: '/console', label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
    { to: '/console/sujets', label: 'Sujets', icon: Tags },
  ] },
  { title: 'Équipe', items: [
    { to: '/console/actions', label: 'Actions', icon: Megaphone },
    { to: '/console/mon-equipe', label: 'Mon équipe', icon: UserRound },
    { to: '/console/rapports', label: 'Rapports', icon: ClipboardList },
  ] },
  { title: 'Outils', items: [
    { to: '/console/powerpoint', label: 'PowerPoint', icon: Presentation },
    { to: '/console/ressources', label: 'Ressources', icon: BookOpen },
  ] },
]

const RH_NAV: NavGroup[] = [
  { title: 'Suivi', items: [
    { to: '/console', label: 'Entreprise', icon: Building, end: true },
    { to: '/console/sujets', label: 'Sujets', icon: Tags },
    { to: '/console/fiches', label: 'Fiches salariés', icon: UserRound },
  ] },
  { title: 'Organisation', items: [
    { to: '/console/equipes', label: 'Équipes', icon: Users },
    { to: '/console/personnes', label: 'Personnes', icon: UserCog },
  ] },
  { title: 'Outils', items: [
    { to: '/console/powerpoint', label: 'PowerPoint', icon: Presentation },
    { to: '/console/ressources', label: 'Ressources', icon: BookOpen },
  ] },
]

/** Initiales pour l'avatar du compte (« Marie Manager » → « MM »). */
const initials = (name: string | null | undefined) =>
  (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'

/** Mise en page bureau de la console : menu à gauche (en haut sur petit écran), contenu large. */
export default function ConsoleLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const isRh = profile?.role === 'rh'
  const nav = isRh ? RH_NAV : MANAGER_NAV

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="flex flex-col bg-wz-navy text-white lg:fixed lg:inset-y-0 lg:w-64">
        <div className="flex items-center gap-3 px-5 py-4 lg:px-6 lg:pt-7 lg:pb-8">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white"><img src="/logo.png" alt="" className="h-7 w-auto" /></span>
          <div>
            <p className="text-lg leading-tight font-semibold tracking-tight text-white">WorkZen</p>
            <p className="text-xs text-brand-200">{isRh ? 'Console RH' : 'Console manager'}</p>
          </div>
          <AccessibilityButton tone="dark" className="ml-auto lg:hidden" />
        </div>

        <nav aria-label="Console" className="px-3 lg:flex-1 lg:overflow-y-auto">
          <ul className="flex gap-1 overflow-x-auto pb-3 lg:block lg:space-y-6 lg:overflow-visible lg:pb-0">
            {nav.map((group) => (
              <li key={group.title} className="contents lg:block">
                <p className="hidden px-3.5 pb-2 text-[0.6875rem] font-semibold tracking-wide text-brand-200/70 uppercase lg:block">{group.title}</p>
                <ul className="contents lg:block lg:space-y-0.5">
                  {group.items.map(({ to, label, icon: Icon, end }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          `relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors
                           focus-visible:outline-2 focus-visible:outline-white
                           ${isActive ? 'bg-white/10 font-semibold text-white' : 'font-medium text-brand-100/80 hover:bg-white/5 hover:text-white'}`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span aria-hidden="true" className={`absolute top-2 bottom-2 left-0 w-0.5 rounded-r-sm bg-brand-400 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                            <Icon size={18} aria-hidden="true" className={isActive ? 'text-brand-300' : ''} />
                            {label}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden border-t border-white/10 p-5 lg:block">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-500/25 text-sm font-semibold text-white">
              {initials(profile?.full_name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{profile?.full_name ?? 'Mon compte'}</p>
              <p className="text-xs text-brand-200">{isRh ? 'RH' : 'Manager'}</p>
            </div>
          </div>
          <AccessibilityButton tone="dark" withLabel className="mt-3 -ml-2.5 px-2.5! py-1.5!" />
          {!isRh && (
            <NavLink to="/manager" className="mt-3 flex items-center gap-2 text-sm text-brand-100/80 hover:text-white">
              <Smartphone size={16} aria-hidden="true" /> Version mobile
            </NavLink>
          )}
          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex items-center gap-2 rounded-lg text-sm text-brand-100/80 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <LogOut size={16} aria-hidden="true" /> Se déconnecter
          </button>
          <LegalLinks className="mt-4" tone="dark" />
        </div>
      </aside>

      <main className="flex-1 lg:pl-64">
        <div key={location.pathname} className="wz-fade-in mx-auto max-w-6xl px-4 py-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
