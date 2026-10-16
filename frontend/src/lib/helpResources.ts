/**
 * Page « Besoin d'aide ? » : numéros et sites utiles (France).
 *
 * Numéros, horaires et gratuité recopiés de sante.fr (ministère de la Santé), page
 * « Lignes d'écoute », complétés par ameli.fr, defenseurdesdroits.fr et service-public.gouv.fr.
 * Vérifiés le 13 octobre 2026 : à revérifier régulièrement (HELP_CHECKED), un numéro faux ici serait grave.
 */
export const HELP_CHECKED = '13 octobre 2026'
export const HELP_SOURCE = { label: 'sante.fr', url: 'https://www.sante.fr/trouver-aide-sante-mentale/selon-votre-profil/lignes-ecoute' }

export interface HelpEntry {
  name: string
  description: string
  /** Numéro affiché (avec espaces) ; le lien d'appel retire les espaces */
  phone?: string
  /** Numéro joignable par SMS uniquement (ex. 114) */
  sms?: boolean
  hours?: string
  url?: string
  urlLabel?: string
  /** Lieu sans numéro national : recherche sur une carte autour de la personne (adresse, téléphone, itinéraire) */
  nearby?: { query: string; label: string }
}

export interface HelpSection {
  id: string
  title: string
  intro?: string
  entries: HelpEntry[]
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'urgence',
    title: 'En cas de danger immédiat',
    intro: "Si ta vie ou celle de quelqu'un d'autre est en danger, appelle tout de suite.",
    entries: [
      { name: 'SAMU', phone: '15', description: 'Urgence médicale, y compris une crise suicidaire.', hours: '24 h/24' },
      { name: "Numéro d'urgence européen", phone: '112', description: 'Depuis n\'importe quel téléphone, partout en Europe.', hours: '24 h/24' },
      { name: 'Urgences par SMS', phone: '114', sms: true, description: 'Pour les personnes sourdes, malentendantes ou qui ne peuvent pas parler.', hours: '24 h/24' },
    ],
  },
  {
    id: 'parler',
    title: 'Parler à quelqu\'un, maintenant',
    intro: 'Des écoutants formés, gratuitement et sans donner ton nom.',
    entries: [
      { name: '3114, prévention du suicide', phone: '3114', description: 'Idées suicidaires, ou inquiétude pour un proche. Des infirmiers et psychologues répondent.', hours: '24 h/24, 7 j/7, gratuit', url: 'https://3114.fr', urlLabel: '3114.fr' },
      { name: 'SOS Amitié', phone: '09 72 39 40 50', description: 'Solitude, stress, mal-être : une écoute anonyme, aussi par chat.', hours: '24 h/24, 7 j/7, gratuit', url: 'https://www.sos-amitie.com', urlLabel: 'sos-amitie.com' },
      { name: 'Suicide Écoute', phone: '01 45 39 40 00', description: 'Pour les personnes en détresse et leurs proches.', hours: '24 h/24, 7 j/7, gratuit', url: 'https://www.suicide-ecoute.fr', urlLabel: 'suicide-ecoute.fr' },
      { name: 'Croix-Rouge Écoute', phone: '0 800 858 858', description: 'Pour toute personne qui a besoin de parler.', hours: 'Lun.-ven. 9 h-19 h, sam.-dim. 12 h-18 h, gratuit' },
    ],
  },
  {
    id: 'travail',
    title: 'Au travail',
    entries: [
      { name: 'Médecine du travail', description: "Un médecin neutre, soumis au secret médical. Tu peux demander à le voir à tout moment ; les RH t'indiquent comment le joindre." },
      { name: 'Harcèlement moral au travail', description: 'Tes droits et les démarches pas à pas : preuves, signalement, inspection du travail.', url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2354', urlLabel: 'service-public.gouv.fr' },
      { name: 'Défenseur des droits', phone: '09 69 39 00 00', description: 'Discrimination ou harcèlement sexuel au travail : information et accompagnement gratuits.', url: 'https://www.defenseurdesdroits.fr', urlLabel: 'defenseurdesdroits.fr' },
    ],
  },
  {
    id: 'violences',
    title: 'Violences',
    entries: [
      { name: 'Violences Femmes Info', phone: '39 19', description: 'Pour les femmes victimes de violences, leurs proches et les professionnels.', hours: '24 h/24, 7 j/7, gratuit et anonyme' },
      { name: 'Aide aux victimes', phone: '116 006', description: "Pour les victimes d'une infraction et leurs proches.", hours: '7 j/7, 9 h-19 h, gratuit', url: 'https://www.france-victimes.fr', urlLabel: 'france-victimes.fr' },
    ],
  },
  {
    id: 'addictions',
    title: 'Alcool, drogues',
    entries: [
      { name: 'Alcool Info Service', phone: '0 980 980 930', description: 'Pour toi ou un proche, sans jugement.', hours: '7 j/7, 8 h-2 h, gratuit et anonyme', url: 'https://www.alcool-info-service.fr', urlLabel: 'alcool-info-service.fr' },
      { name: 'Drogues Info Service', phone: '0 800 23 13 13', description: 'Pour toi ou un proche, sans jugement.', hours: '7 j/7, 8 h-2 h, gratuit et anonyme', url: 'https://www.drogues-info-service.fr', urlLabel: 'drogues-info-service.fr' },
    ],
  },
  {
    id: 'accompagnement',
    title: 'Se faire accompagner',
    entries: [
      {
        name: 'CMP (centre médico-psychologique)',
        description: "Psychiatres, psychologues et infirmiers en consultation, gratuitement. Le CMP qui te reçoit dépend de ton adresse : il n'y a pas de numéro national, cherche celui le plus proche de chez toi. Choisis un CMP « adultes » (le CMPP est pour les enfants).",
        nearby: { query: 'centre médico-psychologique adultes', label: 'Trouver le CMP le plus proche' },
      },
      { name: 'Mon soutien psy', description: "Jusqu'à 12 séances par an chez un psychologue partenaire, remboursées par l'Assurance Maladie, sans ordonnance.", url: 'https://monsoutienpsy.ameli.fr/recherche-psychologue', urlLabel: 'Trouver un psychologue' },
      { name: 'Psycom', description: 'Information publique et fiable sur la santé mentale, les troubles et les soins.', url: 'https://www.psycom.org', urlLabel: 'psycom.org' },
      { name: 'Toutes les lignes d\'écoute', description: "La liste officielle, par situation (jeunes, proches, deuil…).", url: HELP_SOURCE.url, urlLabel: 'sante.fr' },
    ],
  },
]

/** Lien d'appel ou de SMS : « 09 72 39 40 50 » -> « tel:0972394050 » */
export const phoneHref = (e: HelpEntry) => `${e.sms ? 'sms' : 'tel'}:${(e.phone ?? '').replace(/\s/g, '')}`

/**
 * Recherche autour de soi sur Google Maps (format officiel « Maps URLs ») : la carte affiche les lieux
 * les plus proches avec adresse, téléphone, horaires et bouton Itinéraire. Aucune position n'est envoyée
 * par WorkZen : c'est la carte qui demande la localisation, si la personne l'accepte.
 */
export const nearbyHref = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
