/**
 * Sections du rapport PowerPoint. Module léger, partagé par la page (cases à cocher, sommaire)
 * et par le générateur (chargé à la demande avec pptxgenjs).
 */

export type Audience = 'direction' | 'equipe'

export type SectionId =
  | 'synthese'
  | 'courbe'
  | 'equipes'
  | 'sujets'
  | 'problemes'
  | 'actions'
  | 'questionnaires'
  | 'suite'
  | 'parole'
  | 'methode'

export interface SectionDef {
  id: SectionId
  label: string
  hint: string
  /** RH sur toute l'entreprise uniquement */
  companyOnly?: boolean
}

/** Ordre des diapositives après la page de titre. */
export const SECTIONS: Record<Audience, SectionDef[]> = {
  direction: [
    { id: 'synthese', label: 'Synthèse', hint: 'Moyenne, tendance, participation, alerte' },
    { id: 'courbe', label: 'Évolution du moral', hint: 'La courbe, jours masqués compris' },
    { id: 'equipes', label: 'Équipes à surveiller', hint: 'Tableau de toutes les équipes', companyOnly: true },
    { id: 'sujets', label: 'Sujets cités', hint: 'Graphique : cette période vs la précédente' },
    { id: 'problemes', label: 'Les 3 problèmes principaux', hint: 'Constat chiffré + pistes d\'action' },
    { id: 'actions', label: 'Actions déjà publiées', hint: 'Statut, échéance, avis anonymes' },
    { id: 'questionnaires', label: 'Questionnaires anonymes', hint: 'Seulement à partir de 3 réponses' },
    { id: 'suite', label: 'Décisions à prendre', hint: 'Un sujet, une action, un responsable, une date' },
    { id: 'methode', label: 'Méthode et anonymat', hint: 'Comment les chiffres sont produits' },
  ],
  equipe: [
    { id: 'courbe', label: 'Évolution du moral', hint: 'La courbe de l\'équipe' },
    { id: 'sujets', label: 'Ce qui revient le plus', hint: 'Les 3 sujets les plus cités' },
    { id: 'actions', label: 'Nos actions et vos avis', hint: 'Statut et avis anonymes' },
    { id: 'suite', label: 'Ce qu\'on va faire ensuite', hint: 'Actions en cours ou propositions' },
    { id: 'parole', label: 'À vous la parole', hint: 'Questions pour animer l\'échange' },
  ],
}

/** Sections proposées pour ce public et ce périmètre. */
export function availableSections(audience: Audience, companyWide: boolean): SectionDef[] {
  return SECTIONS[audience].filter((s) => !s.companyOnly || companyWide)
}

export type PptFont = 'Poppins' | 'Arial'

export interface PptOptions {
  sections: SectionId[]
  /** Notes de l'orateur sous chaque diapositive */
  notes: boolean
  /** Poppins = charte (si installée sur le PC qui présente) ; Arial = rendu identique partout */
  font: PptFont
}
