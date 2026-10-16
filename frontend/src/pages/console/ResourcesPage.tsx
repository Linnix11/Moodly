import { useState } from 'react'
import { Card, ConsoleHeader } from '../../components/console/ConsoleUi'
import { GuideContent } from '../../components/GuideSheet'
import { MANAGER_GUIDES, TAGS, type Tag } from '../../lib/constants'

/** Console : toutes les fiches conseil (B5), une par sujet. */
export default function ResourcesPage() {
  const [open, setOpen] = useState<Tag>(TAGS[0])
  return (
    <>
      <ConsoleHeader title="Ressources" subtitle="Des fiches courtes pour agir sur chaque sujet remonté par l'équipe." />
      <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Fiches conseil">
          <ul className="space-y-1">
            {TAGS.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  aria-current={open === t ? 'true' : undefined}
                  onClick={() => setOpen(t)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-brand-600
                    ${open === t ? 'bg-brand-50 font-semibold text-brand-700' : 'text-gray-700 hover:bg-white'}`}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <Card title={MANAGER_GUIDES[open].titre}>
          <GuideContent tag={open} />
        </Card>
      </div>
    </>
  )
}
