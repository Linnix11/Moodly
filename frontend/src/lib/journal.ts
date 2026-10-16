import { readItem, removeItem, writeItem } from './storage'

/**
 * Journal privé : stocké UNIQUEMENT dans ce navigateur (localStorage), jamais envoyé au serveur.
 * Une clé par utilisateur pour que deux comptes sur un même appareil ne se mélangent pas.
 */
export interface JournalEntry {
  score: number
  tags: string[]
}
export type Journal = Record<string, JournalEntry> // clé : 'YYYY-MM-DD'

const keyFor = (userId: string) => `moodly_journal_${userId}`

export async function getJournal(userId: string): Promise<Journal> {
  const value = readItem(keyFor(userId))
  if (!value) return {}
  try {
    return JSON.parse(value) as Journal
  } catch {
    return {}
  }
}

export async function addEntry(userId: string, date: string, score: number, tags: string[]): Promise<void> {
  const journal = await getJournal(userId)
  journal[date] = { score, tags }
  writeItem(keyFor(userId), JSON.stringify(journal))
}

export async function clearJournal(userId: string): Promise<void> {
  removeItem(keyFor(userId))
}
