import { TAGS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { ManagedTopic } from './types'

/**
 * Sujets proposés à l'utilisateur : les 7 de base + ceux de l'entreprise + ceux de son équipe.
 * Si la migration « custom_topics » n'est pas encore passée, on retombe sur la liste de base.
 */
export async function getAvailableTopics(): Promise<string[]> {
  const { data, error } = await supabase.rpc('available_topics')
  if (error) return [...TAGS]
  const labels = ((data ?? []) as { label: string }[]).map((t) => t.label)
  return labels.length > 0 ? labels : [...TAGS]
}

/** Manager : base + entreprise + son équipe ; RH : tous les sujets. */
export async function listManagedTopics(): Promise<ManagedTopic[]> {
  const { data, error } = await supabase.rpc('manage_topics_list')
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

/** Manager : sujet pour son équipe ; RH : sujet pour toute l'entreprise. */
export async function createTopic(label: string): Promise<void> {
  const { error } = await supabase.rpc('create_topic', { p_label: label })
  if (error) throw toFriendlyError(error.message)
}

/** Retirer (ou remettre) un sujet personnalisé. Les sujets de base ne se retirent pas. */
export async function setTopicActive(id: number, active: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_topic_active', { p_id: id, p_active: active })
  if (error) throw toFriendlyError(error.message)
}
