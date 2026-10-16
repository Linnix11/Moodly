import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/legal/mentions-legales', label: 'Mentions légales' },
  { to: '/legal/cgu', label: 'CGU' },
  { to: '/legal/cgv', label: 'CGV' },
  { to: '/legal/confidentialite', label: 'Confidentialité' },
  { to: '/legal/cookies', label: 'Cookies' },
]

/** Liens vers les pages légales, en petit (pied de page, menu de la console). */
export function LegalLinks({ className = '', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  return (
    <nav aria-label="Informations légales" className={className}>
      <ul className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${tone === 'dark' ? 'text-brand-200' : 'text-gray-500'}`}>
        {LINKS.map((l) => (
          <li key={l.to}><Link to={l.to} className={`hover:underline ${tone === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}>{l.label}</Link></li>
        ))}
      </ul>
    </nav>
  )
}
