import { Check, Search, UserPlus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listTeams, listUsers, setUser } from '../../api/console'
import type { Role, UserRow } from '../../api/types'
import { Card, ConsoleHeader, ErrorBox, KpiCard, RefreshButton } from '../../components/console/ConsoleUi'
import { CreateUserForm } from '../../components/console/CreateUserForm'
import { primaryButton } from '../../components/console/styles'
import { useLoader } from '../../lib/useLoader'
import { useAuth } from '../../store/authStore'

const ROLE_LABELS: Record<Role, string> = { employee: 'Employé', manager: 'Manager', rh: 'RH' }
const fieldClass =
  'rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200'

interface Draft {
  role: string
  team: string
}

/** Console RH : création des comptes, rôle et équipe de chacun. */
export default function PeoplePage() {
  const myId = useAuth((s) => s.profile?.id)
  const fetcher = useCallback(() => Promise.all([listUsers(), listTeams()]), [])
  const { data, error, loading, reload } = useLoader(fetcher)
  const [users, teams] = data ?? [[], []]

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  // Filtre d'équipe dans l'URL (?equipe=12 ou ?equipe=none) : lien direct depuis « Équipes »
  const [params, setParams] = useSearchParams()
  const teamFilter = params.get('equipe') ?? ''
  const setTeamFilter = (v: string) => setParams((p) => {
    const next = new URLSearchParams(p)
    if (v) next.set('equipe', v)
    else next.delete('equipe')
    return next
  }, { replace: true })
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) =>
      (!q || u.email.toLowerCase().includes(q) || (u.full_name ?? '').toLowerCase().includes(q)) &&
      (!roleFilter || (roleFilter === 'none' ? u.role === null : u.role === roleFilter)) &&
      (!teamFilter || (teamFilter === 'none' ? u.equipe_id === null : u.equipe_id?.toString() === teamFilter)),
    )
  }, [users, query, roleFilter, teamFilter])

  const counts = useMemo(() => ({
    employee: filtered.filter((u) => u.role === 'employee').length,
    manager: filtered.filter((u) => u.role === 'manager').length,
    rh: filtered.filter((u) => u.role === 'rh').length,
    // Employés sans équipe : ils ne comptent dans aucune statistique
    orphans: filtered.filter((u) => u.role === 'employee' && u.equipe_id === null).length,
  }), [filtered])

  const draftOf = (u: UserRow): Draft => drafts[u.user_id] ?? { role: u.role ?? '', team: u.equipe_id?.toString() ?? '' }
  const isDirty = (u: UserRow) => {
    const d = draftOf(u)
    return d.role !== (u.role ?? '') || d.team !== (u.equipe_id?.toString() ?? '')
  }

  const save = async (u: UserRow) => {
    const d = draftOf(u)
    setSavingId(u.user_id)
    setActionError(null)
    try {
      await setUser(u.user_id, d.role, d.team ? Number(d.team) : null)
      setDrafts((all) => {
        const rest = { ...all }
        delete rest[u.user_id]
        return rest
      })
      setSavedId(u.user_id)
      reload()
    } catch (err) {
      setActionError(`${u.email} : ${(err as Error).message}`)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <ConsoleHeader title="Personnes" subtitle="Crée les comptes, puis choisis le rôle et l'équipe de chacun.">
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryButton}>
            <UserPlus size={16} aria-hidden="true" /> Nouveau compte
          </button>
        )}
        <RefreshButton onClick={reload} loading={loading} />
      </ConsoleHeader>

      {creating && (
        <CreateUserForm
          teams={teams}
          defaultTeam={/^\d+$/.test(teamFilter) ? teamFilter : ''}
          onCreated={reload}
          onCancel={() => setCreating(false)}
        />
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}
      {actionError && <ErrorBox message={actionError} />}

      {data && (
        <dl className="mt-8 grid grid-cols-2 overflow-hidden rounded-2xl bg-white md:grid-cols-4">
          <KpiCard label="Employés" value={counts.employee} />
          <KpiCard label="Managers" value={counts.manager} />
          <KpiCard label="RH" value={counts.rh} />
          <KpiCard label="Employés sans équipe" value={counts.orphans} tone={counts.orphans > 0 ? 'bad' : 'default'} hint="Absents de toutes les stats" />
        </dl>
      )}

      <Card className="mt-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <label htmlFor="people-search" className="sr-only">Rechercher</label>
            <input id="people-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom ou email" className={`${fieldClass} pl-9`} />
          </div>
          <label htmlFor="people-role" className="sr-only">Filtrer par rôle</label>
          <select id="people-role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={fieldClass}>
            <option value="">Tous les rôles</option>
            <option value="employee">Employés</option>
            <option value="manager">Managers</option>
            <option value="rh">RH</option>
            <option value="none">Sans profil</option>
          </select>
          <label htmlFor="people-team" className="sr-only">Filtrer par équipe</label>
          <select id="people-team" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={fieldClass}>
            <option value="">Toutes les équipes</option>
            <option value="none">Sans équipe</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {(query || roleFilter || teamFilter) && (
            <button type="button" onClick={() => { setQuery(''); setRoleFilter(''); setTeamFilter('') }} className="text-sm font-medium text-brand-700 hover:underline">
              Réinitialiser
            </button>
          )}
          <span className="text-sm text-gray-500">{filtered.length} compte{filtered.length > 1 ? 's' : ''}</span>
        </div>

        {!data && loading ? <div className="h-64 animate-pulse rounded-xl bg-gray-100" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-500">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Compte</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Rôle</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Équipe</th>
                  <th scope="col" className="py-2 font-medium"><span className="sr-only">Enregistrer</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => {
                  const d = draftOf(u)
                  const me = u.user_id === myId
                  const setDraft = (patch: Partial<Draft>) => {
                    setSavedId(null)
                    setDrafts((all) => ({ ...all, [u.user_id]: { ...d, ...patch } }))
                  }
                  return (
                    <tr key={u.user_id}>
                      <th scope="row" className="py-3 pr-4 font-normal">
                        <p className="font-medium text-gray-900">{u.full_name ?? u.email}{me && <span className="ml-1 text-xs text-gray-400">(toi)</span>}</p>
                        {u.full_name && <p className="text-xs text-gray-500">{u.email}</p>}
                      </th>
                      <td className="py-3 pr-4">
                        <label htmlFor={`role-${u.user_id}`} className="sr-only">Rôle de {u.email}</label>
                        <select
                          id={`role-${u.user_id}`}
                          value={d.role}
                          disabled={me}
                          title={me ? 'Tu ne peux pas retirer ton propre rôle RH' : undefined}
                          onChange={(e) => setDraft({ role: e.target.value })}
                          className={fieldClass}
                        >
                          {u.role === null && <option value="">Sans profil</option>}
                          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <label htmlFor={`team-${u.user_id}`} className="sr-only">Équipe de {u.email}</label>
                        <select id={`team-${u.user_id}`} value={d.team} onChange={(e) => setDraft({ team: e.target.value })} className={fieldClass}>
                          <option value="">Aucune équipe</option>
                          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        {isDirty(u) ? (
                          <button type="button" disabled={savingId === u.user_id || !d.role} onClick={() => save(u)} className={primaryButton}>
                            {savingId === u.user_id ? 'Enregistrement…' : 'Enregistrer'}
                          </button>
                        ) : savedId === u.user_id ? (
                          <span role="status" className="inline-flex items-center gap-1 text-sm text-emerald-700"><Check size={16} aria-hidden="true" /> Enregistré</span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
