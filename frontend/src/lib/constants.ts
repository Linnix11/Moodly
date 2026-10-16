/** Les 5 niveaux d'humeur. Le score envoyé à la base = index + 1 (1 à 5). */
export const MOODS = [
  { score: 1, emoji: '😞', label: 'Très mal' },
  { score: 2, emoji: '🙁', label: 'Pas terrible' },
  { score: 3, emoji: '😐', label: 'Moyen' },
  { score: 4, emoji: '🙂', label: 'Bien' },
  { score: 5, emoji: '😄', label: 'Très bien' },
] as const

/** Tags proposés pour expliquer son humeur (3 maximum, vérifié aussi côté serveur). */
export const TAGS = [
  'Charge de travail',
  "Ambiance d'équipe",
  'Management',
  'Reconnaissance',
  'Équilibre pro/perso',
  'Environnement de travail',
  'Sens du travail',
] as const

export const MAX_TAGS = 3

/** En dessous de ce nombre de réponses, la moyenne d'un jour est masquée (anonymat). */
export const ANONYMITY_THRESHOLD = 3

export const ONBOARDING_KEY = 'moodly_onboarding_done'

/** À partir de cette note (incluse) et en dessous, on propose le questionnaire. */
export const LOW_MOOD_MAX = 2

/**
 * Questionnaire proposé après une mauvaise humeur (5 questions à choix unique).
 * Les "id" sont enregistrés en base : minuscules et "_" uniquement (vérifié côté serveur).
 * On peut changer les libellés librement, mais pas les id déjà utilisés.
 */
export const REPORT_QUESTIONS = [
  {
    label: "Qu'est-ce qui pèse le plus ?",
    choices: [
      { id: 'charge', label: 'Charge de travail' },
      { id: 'relations', label: "Relations dans l'équipe" },
      { id: 'management', label: 'Management' },
      { id: 'vie_perso', label: 'Vie perso' },
      { id: 'autre', label: 'Autre' },
    ],
  },
  {
    label: 'Depuis quand ?',
    choices: [
      { id: 'aujourdhui', label: "Aujourd'hui seulement" },
      { id: 'quelques_jours', label: 'Quelques jours' },
      { id: 'plus_semaine', label: "Plus d'une semaine" },
      { id: 'plus_mois', label: "Plus d'un mois" },
    ],
  },
  {
    label: 'Impact sur ton travail ?',
    choices: [
      { id: 'aucun', label: 'Aucun' },
      { id: 'un_peu', label: 'Un peu' },
      { id: 'beaucoup', label: 'Beaucoup' },
    ],
  },
  {
    label: "Aimerais-tu en parler à quelqu'un ?",
    choices: [
      { id: 'non', label: 'Non' },
      { id: 'manager', label: 'Oui, à mon manager' },
      { id: 'rh', label: 'Oui, aux RH' },
      { id: 'collegue', label: 'Oui, à un collègue' },
    ],
  },
  {
    label: "Qu'est-ce qui t'aiderait le plus ?",
    choices: [
      { id: 'moins_charge', label: 'Moins de charge' },
      { id: 'soutien', label: 'Plus de soutien' },
      { id: 'souplesse', label: 'Plus de souplesse' },
      { id: 'reconnaissance', label: 'Plus de reconnaissance' },
      { id: 'rien', label: "Rien pour l'instant" },
    ],
  },
] as const

/** Question 4 (« Aimerais-tu en parler à quelqu'un ? ») : index dans REPORT_QUESTIONS. */
export const SHARE_QUESTION = 3

/**
 * À qui le questionnaire est transmis AVEC le nom du salarié (même règle qu'en SQL) :
 * « Oui, à mon manager » -> manager, « Oui, aux RH » -> rh, sinon null (anonyme).
 */
export function shareTarget(answers: readonly (string | null)[]): 'manager' | 'rh' | null {
  const a = answers[SHARE_QUESTION]
  return a === 'manager' || a === 'rh' ? a : null
}

/** Libellé d'une réponse enregistrée (question = 0 à 4). Renvoie l'id si le choix n'existe plus. */
export function reportChoiceLabel(question: number, id: string): string {
  return REPORT_QUESTIONS[question]?.choices.find((c) => c.id === id)?.label ?? id
}

export type Tag = (typeof TAGS)[number]

/** Conseils affichés à l'employé après une note de 1 ou 2, selon ses tags (local, rien n'est envoyé). */
export const SUPPORT_TIPS: Record<Tag | 'default', string[]> = {
  'Charge de travail': [
    'Liste tes 3 priorités du jour et identifie ce qui peut attendre.',
    "Ose en parler à ton manager : il voit déjà que la charge remonte dans l'équipe.",
  ],
  "Ambiance d'équipe": [
    "Propose un café ou une pause à un collègue avec qui tu t'entends bien.",
    "Si une tension dure, en parler tôt et calmement évite qu'elle grossisse.",
  ],
  Management: [
    'Note un ou deux exemples concrets : ça aide à en parler sereinement.',
    "Demande un point individuel à ton manager, ou passe par les RH si c'est plus simple.",
  ],
  Reconnaissance: [
    'Prends une minute pour noter ce que tu as réussi cette semaine, même les petites choses.',
    "Partage ton avancée en réunion d'équipe : ton travail mérite d'être vu.",
  ],
  'Équilibre pro/perso': [
    "Fixe-toi une heure de fin aujourd'hui et coupe les notifications après.",
    'Bloque un créneau dans ta semaine pour quelque chose qui te fait du bien.',
  ],
  'Environnement de travail': [
    'Un petit changement peut aider : lumière, place, casque, pause dehors.',
    "Signale ce qui gêne (bruit, matériel) : c'est souvent simple à corriger.",
  ],
  'Sens du travail': [
    "Rappelle-toi à qui ton travail est utile aujourd'hui, même indirectement.",
    'Parle à ton manager des missions qui te motivent le plus.',
  ],
  default: [
    "Fais une vraie pause de 10 minutes, loin de l'écran.",
    "Parles-en à quelqu'un de confiance.",
  ],
}

/** Pistes proposées au manager quand le moral baisse, selon le sujet n°1 (règles simples, sans IA). */
export const ACTION_SUGGESTIONS: Record<Tag | 'default', string[]> = {
  'Charge de travail': [
    'Faire un point priorités en équipe',
    'Reporter ou redistribuer une échéance',
    'Bloquer une demi-journée sans réunion',
  ],
  "Ambiance d'équipe": [
    "Organiser un moment convivial d'équipe",
    'Faire un tour de table « ce qui va / ce qui coince »',
    'Clarifier qui fait quoi sur les sujets partagés',
  ],
  Management: [
    'Proposer un point individuel à chacun cette semaine',
    "Ouvrir un créneau de questions libres avec l'équipe",
    'Expliquer le contexte des dernières décisions',
  ],
  Reconnaissance: [
    "Remercier l'équipe pour un succès récent, en citant des exemples",
    "Mettre en avant le travail de l'équipe auprès de la direction",
    'Instaurer un tour des réussites en réunion hebdo',
  ],
  'Équilibre pro/perso': [
    'Éviter les messages après 19 h',
    'Rappeler que les congés et RTT peuvent être posés',
    'Assouplir les horaires de réunion',
  ],
  'Environnement de travail': [
    'Recenser les problèmes de matériel ou de locaux',
    'Prévoir un espace calme pour se concentrer',
    'Remonter les demandes aux services généraux',
  ],
  'Sens du travail': [
    "Partager l'impact concret du travail de l'équipe",
    "Faire le lien entre les projets et les objectifs de l'entreprise",
    'Demander à chacun sur quoi il aimerait travailler',
  ],
  default: [
    "Faire un point d'équipe pour écouter les difficultés",
    'Proposer des points individuels cette semaine',
    'Partager les prochaines étapes et priorités',
  ],
}

/** Vrai si la chaîne est un des tags proposés. */
export function isTag(value: string | null | undefined): value is Tag {
  return (TAGS as readonly string[]).includes(value ?? '')
}

/** Statuts d'une action (B1) : libellé et couleur du badge. */
export const ACTION_STATUS = {
  prevue: { label: 'Prévue', badge: 'bg-gray-100 text-gray-700' },
  en_cours: { label: 'En cours', badge: 'bg-sky-100 text-sky-800' },
  faite: { label: 'Faite', badge: 'bg-emerald-100 text-emerald-800' },
} as const

/** Fiches conseil pour le manager (B5) : une par sujet, 5 étapes concrètes et 2 erreurs à éviter. */
export const MANAGER_GUIDES: Record<Tag, { titre: string; etapes: string[]; aEviter: string[] }> = {
  'Charge de travail': {
    titre: 'Comment animer un point charge de travail',
    etapes: [
      "Lister ensemble tous les sujets en cours, sans jugement.",
      'Les faire classer par urgence et par importance.',
      'Identifier ce qui peut être reporté, simplifié ou abandonné.',
      "Décider ensemble des arbitrages et de qui fait quoi.",
      "Annoncer la décision et la publier comme action dans WorkZen.",
    ],
    aEviter: ['Chercher qui est surchargé individuellement.', 'Promettre un allègement sans date.'],
  },
  "Ambiance d'équipe": {
    titre: "Comment améliorer l'ambiance d'équipe",
    etapes: [
      "Ouvrir un temps d'échange : « qu'est-ce qui nous aiderait à mieux travailler ensemble ? ».",
      "Repérer les irritants concrets (outils, organisation, communication).",
      "Choisir un ou deux irritants à traiter en priorité.",
      'Organiser un moment convivial simple, sur le temps de travail.',
      'Faire le point un mois plus tard et ajuster.',
    ],
    aEviter: ["Ignorer une tension en espérant qu'elle passe.", 'Imposer un événement « obligatoire et fun ».'],
  },
  Management: {
    titre: 'Comment recueillir un retour sur votre management',
    etapes: [
      'Annoncer que vous souhaitez progresser et que les retours sont bienvenus.',
      'Proposer des points individuels courts et réguliers.',
      'Poser des questions ouvertes : « que devrais-je faire plus, moins, différemment ? ».',
      "Expliquer le contexte de vos décisions récentes.",
      "Choisir un changement concret et le publier comme action.",
    ],
    aEviter: ['Se justifier ou contredire pendant le retour.', 'Chercher à savoir qui a répondu.'],
  },
  Reconnaissance: {
    titre: "Comment mieux reconnaître le travail de l'équipe",
    etapes: [
      'Remercier de façon précise : qui, quoi, quel impact.',
      "Mettre en avant les réussites en réunion d'équipe.",
      "Valoriser le travail de l'équipe auprès de la direction.",
      "Demander à chacun comment il préfère être reconnu.",
      'Instaurer un rituel simple : le tour des réussites de la semaine.',
    ],
    aEviter: ['Des remerciements génériques et collectifs uniquement.', 'Ne parler que de ce qui ne va pas.'],
  },
  'Équilibre pro/perso': {
    titre: "Comment protéger l'équilibre pro/perso",
    etapes: [
      "Rappeler le droit à la déconnexion et l'appliquer vous-même.",
      'Éviter les messages et réunions en dehors des horaires habituels.',
      'Encourager la pose des congés et des RTT.',
      "Assouplir les horaires quand c'est possible.",
      "Revoir les échéances qui imposent des soirées ou des week-ends.",
    ],
    aEviter: ['Envoyer des messages tard « sans attendre de réponse ».', 'Valoriser le présentéisme.'],
  },
  'Environnement de travail': {
    titre: "Comment améliorer l'environnement de travail",
    etapes: [
      "Recenser les problèmes concrets : bruit, matériel, locaux, outils.",
      'Trier ce qui se règle vite et ce qui demande un budget.',
      'Traiter tout de suite les corrections rapides.',
      'Remonter le reste aux services concernés, avec une date.',
      "Tenir l'équipe informée de l'avancement.",
    ],
    aEviter: ['Promettre des changements hors de votre pouvoir.', 'Laisser une demande sans réponse.'],
  },
  'Sens du travail': {
    titre: 'Comment redonner du sens au travail',
    etapes: [
      "Partager l'impact concret du travail de l'équipe (clients, résultats).",
      "Relier chaque projet aux objectifs de l'entreprise.",
      'Demander à chacun sur quoi il aimerait travailler.',
      "Confier des responsabilités qui correspondent aux envies.",
      "Célébrer l'aboutissement des projets.",
    ],
    aEviter: ['Annoncer les décisions sans en expliquer le pourquoi.', 'Réduire les échanges aux seuls indicateurs.'],
  },
}
