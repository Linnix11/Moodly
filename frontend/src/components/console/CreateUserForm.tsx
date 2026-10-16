import { Check, Copy, RefreshCw } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { createUser } from '../../api/console'
import type { Role, Team } from '../../api/types'
import { Card, ErrorBox } from './ConsoleUi'
import { primaryButton, secondaryButton } from './styles'

const fieldClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200'
const labelClass = 'mb-1 block text-xs font-medium text-gray-600'

// Sans caractères ambigus (0/O, 1/l/I) : le mot de passe est souvent dicté ou recopié
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePassword(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** Formulaire RH : crée un compte déjà confirmé, avec mot de passe provisoire à transmettre. */
export function CreateUserForm({ teams, defaultTeam, onCreated, onCancel }: {
  teams: Team[]
  defaultTeam: string
  onCreated: () => void
  onCancel: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(generatePassword)
  const [role, setRole] = useState<Role>('employee')
  const [team, setTeam] = useState(defaultTeam)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // La RH n'est rattachée à aucune équipe
      await createUser({ email, password, fullName, role, teamId: role !== 'rh' && team ? Number(team) : null })
      setCreated({ email: email.trim().toLowerCase(), password })
      onCreated()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(`Identifiant : ${created.email}\nMot de passe provisoire : ${created.password}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const reset = () => {
    setCreated(null)
    setCopied(false)
    setFullName('')
    setEmail('')
    setPassword(generatePassword())
  }

  if (created) {
    return (
      <Card title="Compte créé" className="mt-4">
        <p role="status" className="text-sm text-gray-700">
          Transmets ces identifiants à la personne. Le mot de passe ne sera plus affiché ensuite.
        </p>
        <dl className="mt-3 grid gap-1 rounded-xl bg-gray-50 p-4 font-mono text-sm">
          <div><dt className="inline text-gray-500">Identifiant : </dt><dd className="inline">{created.email}</dd></div>
          <div><dt className="inline text-gray-500">Mot de passe : </dt><dd className="inline">{created.password}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={copy} className={secondaryButton}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? 'Copié' : 'Copier'}
          </button>
          <button type="button" onClick={reset} className={secondaryButton}>Créer un autre compte</button>
          <button type="button" onClick={onCancel} className={primaryButton}>Terminé</button>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Nouveau compte" className="mt-4">
      {error && <ErrorBox message={error} />}
      <form onSubmit={onSubmit} className="mt-2 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label htmlFor="new-user-name" className={labelClass}>Nom complet</label>
          <input id="new-user-name" maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} placeholder="Ex. : Léa Martin" />
        </div>
        <div>
          <label htmlFor="new-user-email" className={labelClass}>Email</label>
          <input id="new-user-email" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} placeholder="lea@entreprise.fr" />
        </div>
        <div>
          <label htmlFor="new-user-password" className={labelClass}>Mot de passe provisoire</label>
          <div className="flex gap-2">
            <input id="new-user-password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${fieldClass} font-mono`} />
            <button type="button" onClick={() => setPassword(generatePassword())} aria-label="Générer un autre mot de passe" title="Générer un autre mot de passe" className="rounded-xl p-2.5 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-600">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="new-user-role" className={labelClass}>Rôle</label>
          <select id="new-user-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={fieldClass}>
            <option value="employee">Employé</option>
            <option value="manager">Manager</option>
            <option value="rh">RH</option>
          </select>
        </div>
        <div>
          <label htmlFor="new-user-team" className={labelClass}>Équipe</label>
          <select id="new-user-team" value={role === 'rh' ? '' : team} disabled={role === 'rh'} onChange={(e) => setTeam(e.target.value)} className={fieldClass}>
            <option value="">Aucune équipe</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {role === 'manager' && <p className="mt-1 text-xs text-gray-500">Pour qu'il gère l'équipe, choisis-le comme manager dans « Équipes ».</p>}
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Création…' : 'Créer le compte'}</button>
          <button type="button" onClick={onCancel} className={secondaryButton}>Annuler</button>
        </div>
      </form>
    </Card>
  )
}
