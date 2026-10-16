export type Role = 'employee' | 'manager' | 'rh'

export interface Profile {
  id: string
  full_name: string | null
  role: Role
  team_id: number | null
  last_mood_date: string | null // format YYYY-MM-DD
  /** Version des CGU acceptée ; undefined si la migration « legal » n'est pas encore passée */
  terms_version?: string | null
}

/** Une ligne renvoyée par la fonction SQL team_stats() */
export interface DayStat {
  jour: string // YYYY-MM-DD
  moyenne: number | null // null si moins de 3 réponses
  nb_reponses: number
  top_tags: string[]
}

/** Une ligne de team_report_summary() : nombre de rapports anonymes ayant choisi cette réponse */
export interface ReportSummaryRow {
  question: number // 1 à 5
  answer: string
  nb: number
}

/** Une action publiée par le manager (table team_actions) */
export interface TeamAction {
  id: number
  message: string
  tag: string | null
  created_at: string // timestamptz ISO
  status: ActionStatus
  due_date: string | null // YYYY-MM-DD
  done_at: string | null
}

export type ActionStatus = 'prevue' | 'en_cours' | 'faite'

/** Réactions anonymes à une action : détail null sous 3 votes */
export interface ActionFeedback {
  action_id: number
  nb_votes: number
  nb_utile: number | null
  nb_insuffisant: number | null
}

/** Moral 7 jours clos avant / après une action (null = pas assez de recul) */
export interface ActionImpact {
  action_id: number
  publie_le: string
  moyenne_avant: number | null
  moyenne_apres: number | null
  delta: number | null
}

/** Comparaison avec l'entreprise (moyenne_entreprise null sous 2 équipes) */
export interface Benchmark {
  moyenne_equipe: number | null
  moyenne_entreprise: number | null
  nb_equipes: number
}

/** Demande de contact vue par le manager ou la RH : la semaine seulement, jamais de note */
export interface ContactRequest {
  id: number
  nom: string
  equipe: string | null
  tag: string | null
  preference: 'en_personne' | 'message'
  semaine: string // lundi de la semaine, YYYY-MM-DD
  traitee: boolean
}

/** Météo d'équipe renvoyée par team_pulse() : jamais de moyenne pour aujourd'hui */
export interface TeamPulse {
  hier_moyenne: number | null // null si moins de 3 réponses hier
  hier_nb_reponses: number
  hier_top_tags: string[]
  aujourdhui_nb_reponses: number
  nb_membres: number
}

/** Périmètre affiché dans la console (une équipe, ou toute l'entreprise pour la RH) */
export interface ConsoleScope {
  equipe_id: number | null
  nom: string
  manager: string | null
  nb_membres: number
}

/** Un sujet cité sur la période, comparé à la période précédente (journées d'au moins 3 réponses) */
export interface TopicStat {
  tag: string
  nb: number
  nb_precedent: number
  total_reponses: number
  total_precedent: number // 0 = pas d'historique exploitable sur la période précédente
}

/** Une ligne de la vue entreprise (RH) : 7 derniers jours clos vs les 7 d'avant */
export interface TeamOverviewRow {
  equipe_id: number
  nom: string
  manager: string | null
  nb_membres: number
  nb_reponses_7j: number | null // null si équipe masquée
  moyenne_7j: number | null
  moyenne_prec: number | null
  sujet: string | null
  masquee: boolean // équipe de moins de 3 employés
}

/** Un compte vu par la RH (role null = compte sans profil) */
export interface UserRow {
  user_id: string
  email: string
  full_name: string | null
  role: Role | null
  equipe_id: number | null
  equipe: string | null
}

export interface Team {
  id: number
  name: string
  manager_id: string | null
}

/** Un salarié qui a partagé au moins un questionnaire avec son nom (fiche) */
export interface SharedPerson {
  user_id: string
  nom: string
  equipe: string | null
  nb: number
  dernier: string // YYYY-MM-DD
  a_traiter: number
}

/** Un questionnaire partagé avec le nom du salarié (historique de sa fiche) */
export interface SharedReport {
  id: number
  report_date: string // YYYY-MM-DD
  answers: string[]
  commentaire: string | null
  traitee: boolean
}

/** Ce que le salarié a lui-même partagé (vue « mes partages ») */
export interface MySharedReport {
  report_date: string
  destinataire: 'manager' | 'rh'
  answers: string[]
  commentaire: string | null
  traitee: boolean
}

/** Mon accord « Mon manager peut voir mes réponses » */
export interface MySharing {
  actif: boolean
  depuis: string | null
}

/** Un membre de l'équipe vu par son manager (réponses seulement s'il partage) */
export interface TeamMember {
  user_id: string
  nom: string
  partage: boolean
  nb_humeurs: number
  derniere_humeur: string | null
  nb_questionnaires: number
  a_traiter: number
}

/** Une humeur partagée par un membre (avec son accord) */
export interface MemberMood {
  mood_date: string
  score: number
  tags: string[]
}

/** Un sujet dans l'écran de gestion (console manager / RH) */
export interface ManagedTopic {
  id: number
  label: string
  base: boolean
  active: boolean
  equipe: string | null // null = toute l'entreprise
  modifiable: boolean
}
