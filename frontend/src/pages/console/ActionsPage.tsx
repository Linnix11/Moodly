import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { deleteAction, getActionFeedback, getActionImpact, getActions, setActionStatus } from '../../api/actions'
import type { ActionImpact, ActionStatus, TeamAction } from '../../api/types'
import { ActionList, ActionStatusSummary } from '../../components/ActionList'
import { ConsoleHeader, ErrorBox, RefreshButton } from '../../components/console/ConsoleUi'
import { primaryButton } from '../../components/console/styles'
import { PublishActionSheet } from '../../components/PublishActionSheet'
import { useLoader } from '../../lib/useLoader'

type SheetState = { action?: TeamAction } | null

/** Console manager : toutes les actions publiées (publier, modifier, supprimer). */
export default function ActionsPage() {
  const [sheet, setSheet] = useState<SheetState>(null)
  const fetcher = useCallback(
    () => Promise.all([getActions(100), getActionFeedback(), getActionImpact().catch(() => new Map<number, ActionImpact>())]),
    [],
  )
  const { data, error, loading, reload } = useLoader(fetcher)

  const [actions, feedback, impact] = data ?? [null, new Map(), new Map()]

  const onStatusChange = async (id: number, status: ActionStatus, dueDate: string | null) => {
    await setActionStatus(id, status, dueDate)
    reload()
  }

  const onDelete = async (id: number) => {
    await deleteAction(id)
    reload()
  }

  return (
    <>
      <ConsoleHeader title="Actions" subtitle="Ce que vous avez mis en place suite aux retours. Visible par toute l'équipe dans l'app.">
        <button type="button" onClick={() => setSheet({})} className={primaryButton}>
          <Plus size={16} aria-hidden="true" /> Publier une action
        </button>
        <RefreshButton onClick={reload} loading={loading} />
      </ConsoleHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="mt-8 max-w-3xl">
        {!data && loading && <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />}
        {actions && actions.length > 0 && <div className="mb-4"><ActionStatusSummary actions={actions} /></div>}
        {actions?.length === 0 && (
          <p className="rounded-2xl bg-white p-5 text-sm text-gray-500">
            Aucune action publiée pour l'instant. Montrez à l'équipe que ses retours comptent.
          </p>
        )}
        {actions && actions.length > 0 && (
          <ActionList
            actions={actions}
            mode="manager"
            feedback={feedback}
            impact={impact}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onEdit={(action) => setSheet({ action })}
          />
        )}
      </div>

      {sheet && (
        <PublishActionSheet
          actionId={sheet.action?.id}
          initialMessage={sheet.action?.message}
          initialTag={sheet.action?.tag}
          onClose={() => setSheet(null)}
          onPublished={() => {
            setSheet(null)
            reload()
          }}
        />
      )}
    </>
  )
}
