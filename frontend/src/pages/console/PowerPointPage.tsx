import { Check, FileDown } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { getActionFeedback, getActions } from '../../api/actions'
import { getCompanyOverview, getReportSummaryRange, getScope, getStatsRange, getTopics, listTeams } from '../../api/console'
import type { Team } from '../../api/types'
import { Card, ConsoleHeader, ErrorBox, PeriodPicker } from '../../components/console/ConsoleUi'
import { primaryButton } from '../../components/console/styles'
import { ANONYMITY_THRESHOLD } from '../../lib/constants'
import { localISO } from '../../lib/date'
import { type Audience, availableSections, type PptFont, type SectionId } from '../../lib/pptSections'
import { useLoader } from '../../lib/useLoader'
import { useAuth } from '../../store/authStore'

const noTeams = () => Promise.resolve<Team[]>([])

const fieldClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700'

/** Groupe de boutons-pilules à choix unique (même voix que le choix de période). */
function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg bg-white p-1 ring-1 ring-gray-200">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-600
            ${value === o.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Génère un PowerPoint « problèmes et pistes d'action » à partir des données agrégées de la console. */
export default function PowerPointPage() {
  const isRh = useAuth((s) => s.profile?.role === 'rh')
  const [days, setDays] = useState(30)
  const [teamId, setTeamId] = useState('') // RH : '' = toute l'entreprise
  const [audienceChoice, setAudience] = useState<Audience>('direction')
  // La version équipe porte sur UNE équipe (la RH doit en choisir une)
  const teamVersionAvailable = !isRh || teamId !== ''
  const audience: Audience = audienceChoice === 'equipe' && teamVersionAvailable ? 'equipe' : 'direction'
  const companyWide = isRh && teamId === ''

  const sections = useMemo(() => availableSections(audience, companyWide), [audience, companyWide])
  // Sections décochées (par public) : tout est inclus par défaut
  const [excluded, setExcluded] = useState<Record<Audience, SectionId[]>>({ direction: [], equipe: [] })
  const included = sections.filter((s) => !excluded[audience].includes(s.id))
  const toggle = (id: SectionId) => setExcluded((all) => ({
    ...all,
    [audience]: all[audience].includes(id) ? all[audience].filter((x) => x !== id) : [...all[audience], id],
  }))

  const [notes, setNotes] = useState(true)
  const [font, setFont] = useState<PptFont>('Poppins')
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle')
  const [slideCount, setSlideCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const teams = useLoader(useCallback(() => (isRh ? listTeams() : noTeams()), [isRh]))

  const generate = async () => {
    setStatus('busy')
    setError(null)
    try {
      const id = teamId ? Number(teamId) : null
      const since = localISO(new Date(Date.now() - days * 86_400_000))
      const [scope, stats, topics, actions, anonymous, overview, feedback] = await Promise.all([
        getScope(id),
        getStatsRange(days, id),
        getTopics(days, id),
        getActions(200, id, since),
        getReportSummaryRange(days, id),
        companyWide && audience === 'direction' ? getCompanyOverview() : Promise.resolve(null),
        getActionFeedback(id).catch(() => new Map()),
      ])
      const { generatePowerPoint } = await import('../../lib/pptReport')
      const count = await generatePowerPoint(
        { scope, days, stats, topics, actions, anonymous, teams: overview, feedback, audience },
        { sections: included.map((s) => s.id), notes, font },
      )
      setSlideCount(count)
      setStatus('done')
    } catch (err) {
      setError((err as Error).message)
      setStatus('idle')
    }
  }

  const onParamChange = () => status === 'done' && setStatus('idle')

  return (
    <>
      <ConsoleHeader title="Rapport PowerPoint" subtitle="Un support prêt à présenter : les problèmes, des pistes d'action concrètes et les notes de l'orateur." />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6">
        <Card title="Paramètres">
          <div className="space-y-5">
            {isRh && (
              <div>
                <label htmlFor="ppt-scope" className={labelClass}>Périmètre</label>
                <select id="ppt-scope" value={teamId} onChange={(e) => { setTeamId(e.target.value); onParamChange() }} className={fieldClass}>
                  <option value="">Toute l'entreprise</option>
                  {(teams.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <p className={labelClass}>Public</p>
              <Segmented
                label="Public"
                value={audience}
                onChange={(v) => { setAudience(v); onParamChange() }}
                options={[
                  { value: 'direction', label: 'Pour la direction' },
                  { value: 'equipe', label: "Pour l'équipe", disabled: !teamVersionAvailable },
                ]}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                {isRh && !teamVersionAvailable
                  ? "Choisissez une équipe pour la version à présenter à l'équipe."
                  : audience === 'equipe'
                    ? "Sans vue entreprise ni pistes internes : à projeter devant l'équipe."
                    : 'Support complet : constats, pistes et décisions à prendre.'}
              </p>
            </div>

            <div>
              <p className={labelClass}>Période (jusqu'à hier)</p>
              <PeriodPicker value={days} onChange={(d) => { setDays(d); onParamChange() }} />
            </div>

            <div>
              <p className={labelClass}>Police</p>
              <Segmented
                label="Police"
                value={font}
                onChange={(v) => { setFont(v); onParamChange() }}
                options={[{ value: 'Poppins', label: 'Poppins (charte)' }, { value: 'Arial', label: 'Arial' }]}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Poppins doit être installée sur l'ordinateur qui présente, sinon PowerPoint la remplace. Arial s'affiche à l'identique partout.
              </p>
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input type="checkbox" checked={notes} onChange={(e) => { setNotes(e.target.checked); onParamChange() }} className="mt-0.5 size-4 shrink-0 accent-brand-700" />
              <span>
                <span className="font-medium text-gray-900">Notes de l'orateur</span>
                <span className="block text-xs text-gray-500">Sous chaque diapositive : quoi dire, chiffres à l'appui.</span>
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={status === 'busy' || included.length === 0}
            className={`mt-6 w-full justify-center ${primaryButton}`}
          >
            <FileDown size={18} aria-hidden="true" />
            {status === 'busy' ? 'Génération…' : 'Générer le PowerPoint'}
          </button>
          {status === 'done' && (
            <p role="status" className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700">
              <Check size={16} aria-hidden="true" /> Fichier .pptx téléchargé ({slideCount} diapositives, plus les suites de tableaux s'il y en a).
            </p>
          )}
          {error && <ErrorBox message={error} />}
          <p className="mt-4 text-xs text-gray-500">
            Le fichier est créé dans votre navigateur : aucune donnée n'est envoyée ailleurs. Il ne contient aucune donnée nominative.
          </p>
        </Card>

        <Card title="Contenu" action={<span className="text-xs text-gray-500">{included.length + 1} sections</span>}>
          <ol className="divide-y divide-gray-200">
            <li className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex size-5 items-center justify-center rounded-full bg-gray-900 text-white"><Check size={12} aria-hidden="true" /></span>
              <span className="font-medium text-gray-900">Titre</span>
              <span className="text-xs text-gray-500">Périmètre et période</span>
            </li>
            {sections.map((s) => {
              const on = !excluded[audience].includes(s.id)
              return (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-2.5 text-sm">
                    <input type="checkbox" checked={on} onChange={() => { toggle(s.id); onParamChange() }} className="mt-0.5 size-4 shrink-0 accent-brand-700" />
                    <span className="min-w-0">
                      <span className={`font-medium ${on ? 'text-gray-900' : 'text-gray-500 line-through'}`}>{s.label}</span>
                      <span className="block text-xs text-gray-500">{s.hint}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ol>
          <p className="mt-3 text-xs text-gray-500">
            Les sections sans données suffisantes (moins de {ANONYMITY_THRESHOLD} réponses) affichent un message au lieu de chiffres, ou sont omises.
          </p>
        </Card>
      </div>
    </>
  )
}
