import { ArrowDownRight, ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react'
import { formatDecimal } from '../../lib/date'
import type { ReactNode } from 'react'
import { PERIODS } from './styles'

/** En-tête de page de la console : titre, sous-titre et boutons à droite. */
export function ConsoleHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl leading-[1.1] font-medium text-gray-900 lg:text-4xl">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

/** Choix de la période (toujours jusqu'à hier). */
export function PeriodPicker({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Période" className="inline-flex rounded-lg bg-white p-1 ring-1 ring-gray-200">
      {PERIODS.map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={value === d}
          onClick={() => onChange(d)}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-brand-600
            ${value === d ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          {d} j
        </button>
      ))}
    </div>
  )
}

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Actualiser"
      title="Actualiser"
      className="rounded-lg bg-white p-2.5 text-gray-500 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-600"
    >
      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
    </button>
  )
}

/** Pastille de tendance : flèche + écart, rouge si baisse nette, vert si hausse nette. */
export function TrendChip({ delta, suffix = "vs 7 j d'avant" }: { delta: number; suffix?: string }) {
  const bad = delta <= -0.3
  const good = delta >= 0.3
  const Icon = bad ? ArrowDownRight : good ? ArrowUpRight : ArrowRight
  const tone = bad ? 'bg-red-50 text-red-700' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${tone}`}>
        <Icon size={13} aria-hidden="true" strokeWidth={2.5} />
        {delta >= 0 ? '+' : '−'}{formatDecimal(Math.abs(delta))}
      </span>
      {suffix}
    </span>
  )
}

/** Indicateur (KPI). À placer dans un <dl> « bande » : filets entre cellules, pas de carte par chiffre. */
export function KpiCard({ label, value, hint, tone = 'default', trend = null }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'bad' | 'good'
  trend?: number | null
}) {
  const color = tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : 'text-gray-900'
  return (
    <div className="-mt-px -ml-px min-w-0 border-t border-l border-gray-200 p-4 lg:px-5 lg:py-5">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className={`mt-2 font-display text-[2rem] leading-none font-medium tabular-nums ${color}`}>{value}</dd>
      {trend !== null && <dd className="mt-2.5"><TrendChip delta={trend} /></dd>}
      {hint && <dd className="mt-2 text-xs text-gray-500">{hint}</dd>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
      {message}
      {onRetry && <button type="button" onClick={onRetry} className="ml-2 font-semibold underline">Réessayer</button>}
    </div>
  )
}

export function Card({ title, children, className = '', action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-2xl bg-white p-5 lg:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
