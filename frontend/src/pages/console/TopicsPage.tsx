import { useCallback, useState } from 'react'
import { getTopics } from '../../api/console'
import { Card, ConsoleHeader, ErrorBox, PeriodPicker, RefreshButton } from '../../components/console/ConsoleUi'
import { TopicManager } from '../../components/console/TopicManager'
import { TopicsTable } from '../../components/console/TopicsTable'
import { GuideSheet } from '../../components/GuideSheet'
import { PublishActionSheet } from '../../components/PublishActionSheet'
import { ACTION_SUGGESTIONS, ANONYMITY_THRESHOLD, isTag, type Tag } from '../../lib/constants'
import { useLoader } from '../../lib/useLoader'
import { useAuth } from '../../store/authStore'

/** Console : sujets cités et leur évolution (équipe du manager, ou toute l'entreprise pour la RH), puis gestion des sujets. */
export default function TopicsPage() {
  const isRh = useAuth((s) => s.profile?.role === 'rh')
  const [days, setDays] = useState(30)
  const [sheetTag, setSheetTag] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [guide, setGuide] = useState<Tag | null>(null)
  const fetcher = useCallback(() => getTopics(days), [days])
  const { data, error, loading, reload } = useLoader(fetcher)

  return (
    <>
      <ConsoleHeader
        title="Sujets"
        subtitle={`Ce que ${isRh ? "l'entreprise" : "l'équipe"} cite le plus sur ${days} jours, comparé aux ${days} jours d'avant (journées d'au moins ${ANONYMITY_THRESHOLD} réponses).`}
      >
        <PeriodPicker value={days} onChange={setDays} />
        <RefreshButton onClick={reload} loading={loading} />
      </ConsoleHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {published && <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Action publiée pour l'équipe.</p>}

      <Card className={`mt-8 transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
        {!data && loading ? <div className="h-64 animate-pulse rounded-xl bg-gray-100" /> : data && <TopicsTable topics={data} onPublish={isRh ? undefined : setSheetTag} onGuide={setGuide} />}
      </Card>

      <TopicManager isRh={isRh} />

      {sheetTag && (
        <PublishActionSheet
          initialMessage={isTag(sheetTag) ? ACTION_SUGGESTIONS[sheetTag][0] : ''}
          initialTag={sheetTag}
          onClose={() => setSheetTag(null)}
          onPublished={() => {
            setSheetTag(null)
            setPublished(true)
          }}
        />
      )}
      {guide && <GuideSheet tag={guide} onClose={() => setGuide(null)} />}
    </>
  )
}
