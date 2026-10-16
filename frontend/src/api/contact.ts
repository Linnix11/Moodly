import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { ContactRequest } from './types'

export type Destinataire = 'manager' | 'rh'
export type Preference = 'en_personne' | 'message'

/** « Besoin d'en parler ? » : ni note, ni réponse, ni lien avec une humeur. */
export async function requestContact(destinataire: Destinataire, preference: Preference, tag: string | null): Promise<void> {
  const { error } = await supabase.rpc('request_contact', { p_destinataire: destinataire, p_preference: preference, p_tag: tag })
  if (error) throw toFriendlyError(error.message)
}

/** Mes demandes encore ouvertes (la RLS ne renvoie que les miennes). */
export async function getMyOpenRequests(): Promise<Destinataire[]> {
  const { data, error } = await supabase.from('contact_requests').select('destinataire').eq('traitee', false)
  if (error) throw toFriendlyError(error.message)
  return (data ?? []).map((r: { destinataire: Destinataire }) => r.destinataire)
}

/** Manager : demandes de son équipe ; RH : demandes adressées aux RH. */
export async function listContactRequests(): Promise<ContactRequest[]> {
  const { data, error } = await supabase.rpc('list_contact_requests')
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

export async function markContactHandled(id: number): Promise<void> {
  const { error } = await supabase.rpc('mark_contact_handled', { p_id: id })
  if (error) throw toFriendlyError(error.message)
}
