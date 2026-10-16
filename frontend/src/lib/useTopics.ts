import { useEffect, useState } from 'react'
import { getAvailableTopics } from '../api/topics'
import { TAGS } from './constants'

/** Sujets proposés (base + entreprise + équipe). Affiche la liste de base en attendant la réponse. */
export function useTopics(): string[] {
  const [topics, setTopics] = useState<string[]>([...TAGS])
  useEffect(() => {
    let alive = true
    getAvailableTopics().then((t) => alive && setTopics(t))
    return () => {
      alive = false
    }
  }, [])
  return topics
}
