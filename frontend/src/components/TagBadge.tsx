/** Petit badge pour le sujet (tag) d'une action. */
export function TagBadge({ tag }: { tag: string }) {
  return <span className="inline-block rounded-md bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{tag}</span>
}
