import { useId } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayStat } from '../api/types'
import { ANONYMITY_THRESHOLD, MOODS } from '../lib/constants'
import { CHART, CHARTER } from '../lib/theme'

const formatDay = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

/** Repère d'action sur la courbe (B3) : date YYYY-MM-DD + message */
export interface ChartMarker {
  date: string
  message: string
}

function ChartTooltip({ active, payload, markers }: {
  active?: boolean
  payload?: { payload: DayStat }[]
  markers?: Map<string, string[]>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const actions = markers?.get(d.jour) ?? []
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-[0_4px_16px_-6px_rgb(18_59_99/0.25)]">
      <p className="font-semibold text-gray-900">{formatDay(d.jour)}</p>
      {d.moyenne === null ? (
        <p className="text-gray-500">
          {d.nb_reponses === 0 ? 'Aucune réponse' : `Masqué : moins de ${ANONYMITY_THRESHOLD} réponses`}
        </p>
      ) : (
        <>
          <p className="text-brand-700">
            Moyenne : <strong>{d.moyenne.toFixed(1)}</strong> / 5 · {MOODS[Math.round(d.moyenne) - 1]?.label}
          </p>
          <p className="text-gray-500">{d.nb_reponses} réponses</p>
          {d.top_tags.length > 0 && <p className="mt-1 text-gray-600">{d.top_tags.join(' · ')}</p>}
        </>
      )}
      {actions.map((m) => (
        <p key={m} className="mt-1 max-w-56 border-t border-gray-100 pt-1 text-gray-700"><span className="font-medium">Action publiée :</span> {m}</p>
      ))}
    </div>
  )
}

/** LE graphe unique de l'app : moyenne quotidienne du moral (30 jours sur mobile, 30 à 180 dans la console). */
export function MoodChart({ data, markers = [] }: { data: DayStat[]; markers?: ChartMarker[] }) {
  const long = data.length > 45
  // Repères visibles : seulement les dates présentes sur l'axe (journées closes)
  const days = new Set(data.map((d) => d.jour))
  const byDay = new Map<string, string[]>()
  markers.filter((m) => days.has(m.date)).forEach((m) => byDay.set(m.date, [...(byDay.get(m.date) ?? []), m.message]))
  const gradientId = useId().replace(/:/g, '')
  return (
    <div className="h-72 w-full" aria-label={`Évolution du moral moyen sur ${data.length} jours`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.line} stopOpacity={0.22} />
              <stop offset="100%" stopColor={CHART.line} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="jour"
            tickFormatter={formatDay}
            tick={{ fontSize: 11, fill: CHART.axis }}
            interval={long ? Math.ceil(data.length / 6) - 1 : 6}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: CHART.axis }}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine y={3} stroke={CHART.reference} strokeDasharray="4 4" />
          {[...byDay.entries()].map(([date, messages]) => (
            <ReferenceLine
              key={date}
              x={date}
              stroke={CHART.marker}
              strokeDasharray="3 3"
              label={(props: { viewBox?: unknown }) => {
                const vb = props.viewBox as { x?: number; y?: number } | undefined
                return (
                  <g transform={`translate(${vb?.x ?? 0},${(vb?.y ?? 0) + 12})`}>
                    <title>{messages.join(' · ')}</title>
                    <circle r={5} fill={CHART.marker} stroke={CHARTER.white} strokeWidth={2} />
                  </g>
                )
              }}
            />
          ))}
          <Tooltip content={<ChartTooltip markers={byDay} />} cursor={{ stroke: CHART.reference, strokeWidth: 1 }} />
          <Area type="monotone" dataKey="moyenne" stroke="none" fill={`url(#${gradientId})`} baseValue={1} connectNulls={false} isAnimationActive={false} tooltipType="none" />
          <Line
            type="monotone"
            dataKey="moyenne"
            stroke={CHART.line}
            strokeWidth={2.5}
            dot={long ? false : { r: 2.5, fill: CHART.line, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: CHART.line, stroke: CHARTER.white, strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
