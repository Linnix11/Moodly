import { Check } from 'lucide-react'
import { MAX_TAGS } from '../lib/constants'
import { useTopics } from '../lib/useTopics'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
}

/** Puces cliquables pour expliquer son humeur (facultatif, 3 maximum). */
export function TagChips({ value, onChange }: Props) {
  const topics = useTopics()
  const toggle = (tag: string) => {
    if (value.includes(tag)) onChange(value.filter((t) => t !== tag))
    else if (value.length < MAX_TAGS) onChange([...value, tag])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((tag) => {
        const selected = value.includes(tag)
        const disabled = !selected && value.length >= MAX_TAGS
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => toggle(tag)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm whitespace-nowrap transition-colors
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600
              ${selected ? 'bg-gray-900 font-medium text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-gray-300 active:bg-gray-50'}
              ${disabled ? 'opacity-40' : ''}`}
          >
            {selected && <Check size={14} aria-hidden="true" strokeWidth={2.5} />}
            {tag}
          </button>
        )
      })}
    </div>
  )
}
