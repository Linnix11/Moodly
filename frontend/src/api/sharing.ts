import { supabase } from '../lib/supabase'
import { toFriendlyError } from './errors'
import type { MemberMood, MySharing, TeamMember } from './types'

// « Mon manager peut voir mes réponses » : accord du salarié, désactivé par défaut, révocable.
// En le retirant, tout ce qui a été partagé par ce biais est supprimé (vérifié en SQL).

export async function getMySharing(): Promise<MySharing> {
  const { data, error } = await supabase.rpc('my_sharing')
  if (error) throw toFriendlyError(error.message)
  return (data as MySharing[] | null)?.[0] ?? { actif: false, depuis: null }
}

export async function setShareWithManager(enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_share_with_manager', { p_enabled: enabled })
  if (error) throw toFriendlyError(error.message)
}

/** Manager : les membres de son équipe, avec ce qu'ils ont accepté de partager. */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.rpc('team_members')
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}

/** Manager : humeurs partagées d'un membre (90 derniers jours ; vide s'il ne partage pas). */
export async function getMemberMoods(userId: string): Promise<MemberMood[]> {
  const { data, error } = await supabase.rpc('team_member_moods', { p_user: userId })
  if (error) throw toFriendlyError(error.message)
  return data ?? []
}
