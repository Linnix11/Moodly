/**
 * Textes légaux de WorkZen (mentions légales, CGU, CGV, confidentialité, cookies).
 *
 * Les passages entre crochets « [À COMPLÉTER : …] » dépendent de l'éditeur réel
 * (raison sociale, SIREN, adresse, hébergeur…) : ils sont surlignés à l'écran
 * tant qu'ils ne sont pas remplis. Ces textes sont un modèle : à faire relire
 * par un juriste avant une mise en production.
 *
 * Changer LEGAL_VERSION redemande l'acceptation des CGU à tous les comptes.
 */
export const LEGAL_VERSION = '2026-10-13'

/** Date affichée « Dernière mise à jour » */
export const LEGAL_UPDATED = '13 octobre 2026'

const EDITOR = '[À COMPLÉTER : raison sociale de l\'éditeur]'
const CONTACT = '[À COMPLÉTER : email de contact, ex. contact@workzen.dev]'
const DPO = '[À COMPLÉTER : email du référent données personnelles, ex. dpo@workzen.dev]'

export interface LegalSection {
  title: string
  /** Un paragraphe par entrée ; une entrée qui commence par « - » est un élément de liste. */
  body: string[]
}

export interface LegalDoc {
  slug: string
  title: string
  summary: string
  sections: LegalSection[]
}

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: 'mentions-legales',
    title: 'Mentions légales',
    summary: "Qui édite et héberge WorkZen.",
    sections: [
      {
        title: 'Éditeur',
        body: [
          `WorkZen est édité par ${EDITOR}, [À COMPLÉTER : forme juridique et capital social], immatriculée au RCS de [À COMPLÉTER : ville] sous le numéro [À COMPLÉTER : SIREN], dont le siège est situé [À COMPLÉTER : adresse].`,
          'Numéro de TVA intracommunautaire : [À COMPLÉTER : numéro de TVA].',
          'Directeur de la publication : [À COMPLÉTER : nom du responsable].',
          `Contact : ${CONTACT}.`,
          "WorkZen a été conçu dans le cadre du projet étudiant MOODLY.",
        ],
      },
      {
        title: 'Hébergement',
        body: [
          "Base de données et authentification : Supabase Inc. ([À COMPLÉTER : adresse, à reprendre des conditions de Supabase]). Région d'hébergement des données : [À COMPLÉTER : région du projet Supabase, ex. Europe (Francfort)].",
          "Application web : [À COMPLÉTER : nom, adresse et téléphone de l'hébergeur du site].",
        ],
      },
      {
        title: 'Propriété intellectuelle',
        body: [
          `Les textes, le logo, les illustrations et le code de WorkZen sont la propriété de ${EDITOR}, sauf mention contraire. Toute reproduction sans autorisation est interdite.`,
        ],
      },
      {
        title: 'Cadre légal',
        body: [
          "Ces mentions sont publiées en application de l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN).",
        ],
      },
    ],
  },
  {
    slug: 'cgu',
    title: "Conditions générales d'utilisation",
    summary: "Les règles d'utilisation de l'application, pour les employés, managers et RH.",
    sections: [
      {
        title: '1. Objet',
        body: [
          "Les présentes conditions générales d'utilisation (CGU) encadrent l'utilisation de WorkZen, application de suivi anonyme du moral des équipes, par les personnes à qui leur employeur a ouvert un compte (les « Utilisateurs »).",
          "Pour utiliser WorkZen, l'Utilisateur doit accepter les CGU et prendre connaissance de la politique de confidentialité. Elles lui sont présentées à sa première connexion et à chaque mise à jour.",
        ],
      },
      {
        title: '2. Accès au service',
        body: [
          "Les comptes sont créés par le service RH de l'employeur. Il n'existe pas d'inscription libre.",
          "L'Utilisateur garde son mot de passe confidentiel et prévient les RH s'il pense qu'il a été compromis. Toute action faite avec son compte est présumée faite par lui.",
          "Le service est accessible en continu, sauf maintenance ou panne. L'éditeur ne garantit pas une disponibilité sans interruption.",
        ],
      },
      {
        title: '3. Rôles',
        body: [
          "- Employé : indique son humeur du jour, consulte la météo de son équipe, tient un journal privé, donne son avis anonyme sur les actions et peut demander un échange.",
          "- Manager : consulte les statistiques agrégées et anonymes de son équipe, publie des actions et suit leur avancement.",
          "- RH : gère les comptes et les équipes, consulte les statistiques agrégées de toutes les équipes.",
        ],
      },
      {
        title: '4. Anonymat',
        body: [
          "Les humeurs et les avis sur les actions ne sont jamais rattachés à un utilisateur en base de données. Les réponses au questionnaire non plus, sauf si l'Utilisateur choisit de les partager avec son nom (voir ci-dessous).",
          "Partage avec le manager : l'Utilisateur peut activer, depuis l'onglet « Équipe », l'option « Partager mes réponses avec mon manager ». Tant qu'elle est active, son manager voit avec son nom sa note d'humeur du jour, les sujets choisis et ses questionnaires. L'option est désactivée par défaut ; en la désactivant, tout ce qui a été partagé par ce biais est supprimé.",
          "Questionnaire partagé : à la question « Aimerais-tu en parler à quelqu'un ? », répondre « Oui, à mon manager » ou « Oui, aux RH » transmet ce questionnaire (réponses, commentaire et date) avec le nom de l'Utilisateur au destinataire choisi, qui le retrouve dans une fiche et un historique par salarié. L'Utilisateur en est prévenu avant l'envoi et peut toujours choisir une autre réponse pour rester anonyme. Sa note d'humeur reste anonyme dans tous les cas.",
          "Aucune statistique n'est affichée sous 3 réponses, ni pour une équipe de moins de 3 employés. Pour la journée en cours, seul le nombre de réponses est visible.",
          "Les managers et RH s'engagent à ne pas chercher à identifier l'auteur d'une réponse, par recoupement ou par tout autre moyen.",
        ],
      },
      {
        title: '5. Participation volontaire',
        body: [
          "Répondre est volontaire. Ne pas répondre n'entraîne aucune conséquence, et les réponses ne peuvent servir à évaluer un salarié individuellement.",
        ],
      },
      {
        title: "6. Ce n'est pas un service d'urgence",
        body: [
          "WorkZen n'est ni un outil médical ni un service d'écoute. En cas de détresse, contactez votre médecin, la médecine du travail, le 3114 (numéro national de prévention du suicide, gratuit, 24 h/24) ou le 15 en cas d'urgence.",
        ],
      },
      {
        title: '7. Bon usage',
        body: [
          "Il est interdit de publier des contenus injurieux, discriminatoires ou diffamatoires (notamment dans les actions des managers), de tenter d'accéder aux données d'autres utilisateurs ou de perturber le fonctionnement du service.",
          "En cas de manquement, l'employeur peut suspendre le compte concerné.",
        ],
      },
      {
        title: '8. Responsabilité',
        body: [
          "L'éditeur met en œuvre les moyens raisonnables pour assurer la sécurité et la disponibilité du service. Il n'est pas responsable des décisions prises par l'employeur à partir des statistiques.",
        ],
      },
      {
        title: '9. Modification des CGU',
        body: [
          "Les CGU peuvent évoluer. La nouvelle version est présentée à l'Utilisateur à sa connexion suivante et doit être acceptée pour continuer à utiliser le service.",
        ],
      },
      {
        title: '10. Droit applicable',
        body: [
          "Les CGU sont soumises au droit français. Tout litige relève des juridictions françaises compétentes.",
        ],
      },
    ],
  },
  {
    slug: 'cgv',
    title: 'Conditions générales de vente',
    summary: "Les conditions de l'abonnement souscrit par l'entreprise cliente (vente entre professionnels).",
    sections: [
      {
        title: '1. Objet et champ',
        body: [
          `Les présentes conditions générales de vente (CGV) régissent la fourniture du service WorkZen par ${EDITOR} (le « Prestataire ») à des entreprises et organisations (le « Client »). Elles s'appliquent uniquement entre professionnels.`,
          "Toute commande vaut acceptation des CGV, qui prévalent sur les conditions d'achat du Client sauf accord écrit contraire.",
        ],
      },
      {
        title: '2. Service',
        body: [
          "WorkZen est fourni en mode SaaS (logiciel en ligne) : application employé (web) et console web pour les managers et les RH. Le Client reçoit un droit d'utilisation personnel, non exclusif et non cessible pendant la durée de l'abonnement.",
        ],
      },
      {
        title: '3. Commande',
        body: [
          "La commande est passée par devis ou bon de commande signé, qui précise le nombre d'utilisateurs, la durée et le prix.",
        ],
      },
      {
        title: '4. Prix',
        body: [
          "Prix : [À COMPLÉTER : tarif, ex. X € HT par utilisateur et par mois].",
          "Les prix sont exprimés hors taxes ; la TVA en vigueur s'y ajoute. Ils peuvent être révisés à chaque renouvellement, avec un préavis de [À COMPLÉTER : durée, ex. 2 mois].",
        ],
      },
      {
        title: '5. Facturation et paiement',
        body: [
          "Les factures sont payables à [À COMPLÉTER : délai, ex. 30 jours] à compter de leur date d'émission, par virement.",
          "En cas de retard, des pénalités sont dues au taux de [À COMPLÉTER : taux, au moins trois fois le taux d'intérêt légal], ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (articles L441-10 et D441-5 du Code de commerce).",
          "Après mise en demeure restée sans effet pendant 15 jours, le Prestataire peut suspendre l'accès au service.",
        ],
      },
      {
        title: '6. Durée et résiliation',
        body: [
          "L'abonnement est conclu pour [À COMPLÉTER : durée, ex. 12 mois] et se renouvelle tacitement pour la même durée, sauf résiliation par l'une des parties [À COMPLÉTER : préavis, ex. 1 mois] avant l'échéance.",
          "En cas de manquement grave non corrigé 30 jours après mise en demeure, l'autre partie peut résilier le contrat de plein droit.",
          "Le Client étant un professionnel, il ne bénéficie pas du droit de rétractation prévu pour les consommateurs.",
        ],
      },
      {
        title: '7. Obligations du Client',
        body: [
          "Le Client crée et gère les comptes de ses utilisateurs, informe ses salariés de la mise en place de l'outil et consulte ses instances représentatives du personnel (CSE) lorsque la loi l'exige.",
        ],
      },
      {
        title: '8. Données personnelles',
        body: [
          "Pour les données des utilisateurs, le Client est responsable de traitement et le Prestataire agit comme sous-traitant au sens de l'article 28 du RGPD. Les engagements du Prestataire (sécurité, confidentialité, sous-traitants ultérieurs, sort des données en fin de contrat) figurent dans un accord de traitement des données annexé au contrat.",
          "En fin de contrat, les données du Client sont supprimées sous [À COMPLÉTER : délai, ex. 30 jours], après restitution sur demande.",
        ],
      },
      {
        title: '9. Disponibilité et support',
        body: [
          "Le Prestataire s'engage sur une obligation de moyens. Support : [À COMPLÉTER : email et horaires du support].",
        ],
      },
      {
        title: '10. Responsabilité',
        body: [
          "La responsabilité du Prestataire est limitée aux dommages directs et plafonnée aux sommes payées par le Client au cours des 12 derniers mois.",
        ],
      },
      {
        title: '11. Droit applicable et litiges',
        body: [
          "Les CGV sont soumises au droit français. À défaut d'accord amiable, tout litige est porté devant le tribunal de commerce de [À COMPLÉTER : ville].",
        ],
      },
    ],
  },
  {
    slug: 'confidentialite',
    title: 'Politique de confidentialité',
    summary: 'Quelles données sont collectées, pourquoi, combien de temps, et vos droits (RGPD).',
    sections: [
      {
        title: 'Responsable de traitement',
        body: [
          `Votre employeur, qui a souscrit WorkZen, est responsable du traitement de vos données. ${EDITOR} les traite pour son compte, en tant que sous-traitant.`,
          `Pour toute question ou pour exercer vos droits : ${DPO}, ou le service RH de votre entreprise.`,
        ],
      },
      {
        title: 'Données liées à votre compte',
        body: [
          "- Email, nom, rôle (employé, manager, RH) et équipe.",
          "- Mot de passe : jamais stocké en clair, seulement sous forme chiffrée (hachée) par le service d'authentification.",
          "- Date de votre dernière saisie d'humeur, sans la note : elle sert uniquement à empêcher deux réponses le même jour.",
          "- Version des CGU acceptée et date d'acceptation.",
          "- Journaux techniques de connexion (adresse IP, date), conservés par l'hébergeur pour la sécurité.",
        ],
      },
      {
        title: 'Données anonymes',
        body: [
          "Votre humeur (note de 1 à 5 et sujets cochés), vos avis sur les actions et vos réponses au questionnaire sont enregistrés sans aucun lien avec votre compte : seuls l'équipe et le jour sont conservés. Ils ne sont visibles qu'en statistiques agrégées, jamais sous 3 réponses.",
          "Le questionnaire propose aussi un commentaire libre, facultatif. S'il n'est pas partagé avec votre nom, il est enregistré de la même façon, sans lien avec votre compte, et votre manager le lit tel quel : sans date, mélangé aux autres, et seulement à partir de 3 commentaires sur la période. N'y indiquez pas d'information qui permettrait de vous reconnaître.",
          "Lorsque vous donnez votre avis sur une action, le système retient seulement que vous avez déjà voté (pour éviter les votes en double), pas ce que vous avez répondu.",
        ],
      },
      {
        title: 'Partage volontaire avec votre manager',
        body: [
          "Si vous activez « Partager mes réponses avec mon manager » (onglet « Équipe »), votre manager voit avec votre nom, à partir de ce moment : votre note d'humeur de chaque jour, les sujets choisis (90 derniers jours) et vos questionnaires. Les réponses envoyées avant l'activation restent anonymes.",
          "Base légale : votre consentement, libre et révocable à tout moment. En désactivant l'option, tout ce qui a été partagé par ce biais est supprimé, et votre manager n'y a plus accès.",
          "Pour protéger vos collègues, vos réponses partagées continuent de compter dans les moyennes de l'équipe, mais le seuil d'affichage de 3 réponses ne compte que les réponses anonymes.",
        ],
      },
      {
        title: 'Questionnaires partagés avec votre nom',
        body: [
          "Si, dans le questionnaire, vous répondez « Oui, à mon manager » ou « Oui, aux RH » à la question « Aimerais-tu en parler à quelqu'un ? », ce questionnaire n'est plus anonyme : vos réponses, votre commentaire éventuel et la date sont transmis avec votre nom au destinataire choisi, qui les retrouve dans votre fiche. Vous en êtes prévenu avant l'envoi.",
          "Ces questionnaires sont conservés tant que votre compte existe et supprimés avec lui. Vous pouvez revoir ce que vous avez partagé dans l'onglet « Équipe ». Votre note d'humeur du jour n'est jamais transmise.",
        ],
      },
      {
        title: "Demandes d'échange",
        body: [
          "Si vous demandez un échange (« Besoin d'en parler ? »), le destinataire choisi (votre manager ou les RH) voit votre nom, le sujet si vous en indiquez un, votre préférence (en personne ou par message) et la semaine de la demande. Jamais votre humeur ni une date exacte.",
        ],
      },
      {
        title: 'Données qui restent sur votre appareil',
        body: [
          "Votre journal privé est stocké uniquement sur votre appareil. Il n'est jamais envoyé à nos serveurs : ni votre employeur ni l'éditeur n'y ont accès.",
        ],
      },
      {
        title: 'Finalités et base légale',
        body: [
          "Ces données servent à faire fonctionner le service (authentification, rattachement à une équipe) et à produire des indicateurs anonymes de qualité de vie au travail.",
          "Base légale : l'intérêt légitime de l'employeur à prévenir les risques psychosociaux, en lien avec son obligation de sécurité envers ses salariés (article L4121-1 du Code du travail). La participation reste volontaire.",
          "Aucune décision individuelle n'est prise à partir de ces données, et elles ne sont ni vendues ni utilisées à des fins publicitaires.",
        ],
      },
      {
        title: 'Durées de conservation',
        body: [
          "- Compte : tant que vous faites partie de l'entreprise cliente, puis suppression à la fermeture du compte par les RH.",
          "- Demandes d'échange : supprimées avec le compte.",
          "- Statistiques anonymes : [À COMPLÉTER : durée, ex. 24 mois glissants].",
          "- Journaux techniques : selon la politique de l'hébergeur, [À COMPLÉTER : durée].",
        ],
      },
      {
        title: 'Destinataires et hébergement',
        body: [
          "Les données sont accessibles aux seules personnes habilitées : les RH (comptes et équipes), votre manager (statistiques agrégées de l'équipe, demandes et questionnaires que vous lui avez adressés avec votre nom) et l'éditeur pour la maintenance.",
          "Sous-traitant d'hébergement : Supabase Inc. Région des données : [À COMPLÉTER : région du projet Supabase]. Si des données sont transférées hors de l'Union européenne, ce transfert est encadré par les clauses contractuelles types de la Commission européenne.",
        ],
      },
      {
        title: 'Sécurité',
        body: [
          "Connexions chiffrées (HTTPS), mots de passe hachés, accès aux données contrôlé directement par la base de données (règles par rôle), et aucune lecture directe possible des tables d'humeur.",
        ],
      },
      {
        title: 'Vos droits',
        body: [
          "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité sur vos données personnelles (articles 15 à 21 du RGPD), ainsi que du droit de définir des directives sur leur sort après votre décès.",
          `Pour les exercer : ${DPO}. Une réponse vous est apportée sous un mois.`,
          "Les réponses anonymes ne peuvent pas vous être restituées ni être effacées individuellement : par conception, rien ne permet de savoir lesquelles sont les vôtres.",
          "Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).",
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookies et stockage local',
    summary: 'WorkZen n\'utilise ni publicité ni mesure d\'audience.',
    sections: [
      {
        title: 'Ce que nous stockons',
        body: [
          "WorkZen n'utilise aucun cookie publicitaire, aucun outil de mesure d'audience et aucun traceur tiers.",
          "L'application enregistre seulement, dans le stockage de votre navigateur :",
          "- votre session de connexion, pour ne pas vous redemander votre mot de passe à chaque ouverture ;",
          "- votre journal privé ;",
          "- vos réglages d'accessibilité (taille du texte, contraste, police, animations), qui ne sont jamais transmis à votre employeur ni à nos serveurs ;",
          "- le fait que vous avez déjà vu l'écran de bienvenue.",
        ],
      },
      {
        title: 'Pourquoi aucun bandeau de consentement',
        body: [
          "Ces éléments sont strictement nécessaires au fonctionnement du service demandé : ils sont dispensés de consentement (article 82 de la loi Informatique et Libertés). C'est pourquoi WorkZen n'affiche pas de bandeau cookies.",
        ],
      },
      {
        title: 'Les supprimer',
        body: [
          "La déconnexion supprime la session. Vous pouvez aussi effacer les données du site dans les réglages de votre navigateur, ou désinstaller l'application. Attention : votre journal privé sera alors définitivement perdu.",
        ],
      },
    ],
  },
]

export function legalDoc(slug: string | undefined): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug)
}
