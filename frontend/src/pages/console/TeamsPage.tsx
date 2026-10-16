import { Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteTeam, listTeams, listUsers, saveTeam } from '../../api/console'
import type { Team, UserRow } from '../../api/types'
import { Card, ConsoleHeader, ErrorBox, RefreshButton } from '../../components/console/ConsoleUi'
import { primaryButton, secondaryButton } from '../../components/console/styles'
import { useLoader } from '../../lib/useLoader'

const fieldClass =
  'rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200'

const userLabel = (u: UserRow) => (u.full_name ? `${u.full_name} (${u.email})` : u.email)

/** Liste des managers proposés pour une équipe : ceux qui ne gèrent pas déjà une autre équipe. */
function ManagerSelect({ id, users, teams, teamId, value, onChange }: {
  id: string
  users: UserRow[]
  teams: Team[]
  teamId: number | null
  value: string
  onChange: (v: string) => void
}) {
  const taken = new Set(teams.filter((t) => t.id !== teamId && t.manager_id).map((t) => t.manager_id))
  const managers = users.filter((u) => u.role === 'manager' && !taken.has(u.user_id))
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
      <option value="">Sans manager</option>
      {managers.map((u) => <option key={u.user_id} value={u.user_id}>{userLabel(u)}</option>)}
    </select>
  )
}

/** Console RH : créer, renommer, supprimer les équipes et choisir leur manager. */
export default function TeamsPage() {
  const fetcher = useCallback(() => Promise.all([listTeams(), listUsers()]), [])
  const { data, error, loading, reload } = useLoader(fetcher)
  const [teams, users] = data ?? [[], []]

  const [newName, setNewName] = useState('')
  const [newManager, setNewManager] = useState('')
  const [editing, setEditing] = useState<{ id: number; name: string; manager: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  /** Lance une opération RH puis recharge, en affichant l'erreur éventuelle. */
  const run = async (op: () => Promise<unknown>, after?: () => void) => {
    setBusy(true)
    setActionError(null)
    try {
      await op()
      after?.()
      reload()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    void run(() => saveTeam(null, newName, newManager || null), () => {
      setNewName('')
      setNewManager('')
    })
  }

  const members = (teamId: number) => users.filter((u) => u.equipe_id === teamId && u.role === 'employee').length
  const managerName = (id: string | null) => {
    const u = users.find((x) => x.user_id === id)
    return u ? userLabel(u) : 'Sans manager'
  }

  return (
    <>
      <ConsoleHeader title="Équipes" subtitle="Un manager ne gère qu'une équipe. Les membres se rattachent dans « Personnes ».">
        <RefreshButton onClick={reload} loading={loading} />
      </ConsoleHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {actionError && <ErrorBox message={actionError} />}

      <Card title="Nouvelle équipe" className="mt-8">
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="new-team-name" className="mb-1 block text-xs font-medium text-gray-600">Nom</label>
            <input id="new-team-name" required minLength={2} maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} className={fieldClass} placeholder="Ex. : Support client" />
          </div>
          <div>
            <label htmlFor="new-team-manager" className="mb-1 block text-xs font-medium text-gray-600">Manager</label>
            <ManagerSelect id="new-team-manager" users={users} teams={teams} teamId={null} value={newManager} onChange={setNewManager} />
          </div>
          <button type="submit" disabled={busy || newName.trim().length < 2} className={primaryButton}>
            <Plus size={16} aria-hidden="true" /> Créer l'équipe
          </button>
        </form>
      </Card>

      <Card title={`${teams.length} équipe${teams.length > 1 ? 's' : ''}`} className="mt-4">
        {!data && loading ? <div className="h-40 animate-pulse rounded-xl bg-gray-100" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-500">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Équipe</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Manager</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Membres</th>
                  <th scope="col" className="py-2 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teams.map((t) => editing?.id === t.id ? (
                  <tr key={t.id}>
                    <td className="py-2 pr-4">
                      <label htmlFor={`edit-name-${t.id}`} className="sr-only">Nom de l'équipe</label>
                      <input id={`edit-name-${t.id}`} value={editing.name} maxLength={60} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={fieldClass} />
                    </td>
                    <td className="py-2 pr-4">
                      <label htmlFor={`edit-manager-${t.id}`} className="sr-only">Manager</label>
                      <ManagerSelect id={`edit-manager-${t.id}`} users={users} teams={teams} teamId={t.id} value={editing.manager} onChange={(v) => setEditing({ ...editing, manager: v })} />
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{members(t.id)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button type="button" disabled={busy} onClick={() => run(() => saveTeam(t.id, editing.name, editing.manager || null), () => setEditing(null))} className={primaryButton}>
                        Enregistrer
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className={`ml-2 ${secondaryButton}`}>Annuler</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id}>
                    <th scope="row" className="py-3 pr-4 font-medium">
                      <Link to={`/console/equipes/${t.id}`} className="text-brand-700 hover:underline">{t.name}</Link>
                    </th>
                    <td className="py-3 pr-4 text-gray-700">{managerName(t.manager_id)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      <Link to={`/console/personnes?equipe=${t.id}`} title="Voir les membres" className="text-brand-700 hover:underline">{members(t.id)}</Link>
                    </td>
                    <td className="py-3 text-right">
                      {confirmDelete === t.id ? (
                        <div role="group" aria-label="Confirmer la suppression" className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5">
                          <span className="text-left text-xs text-red-800">Supprimer l'équipe et tout son historique ?</span>
                          <button type="button" disabled={busy} onClick={() => run(() => deleteTeam(t.id), () => setConfirmDelete(null))} className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                            Oui
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-2 py-1 text-sm text-gray-700 hover:bg-white">Annuler</button>
                        </div>
                      ) : (
                        <>
                          <button type="button" onClick={() => setEditing({ id: t.id, name: t.name, manager: t.manager_id ?? '' })} aria-label={`Modifier ${t.name}`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600">
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(t.id)} aria-label={`Supprimer ${t.name}`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-brand-600">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
