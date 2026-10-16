# Design — WorkZen

Système de design verrouillé de l'app. Toute refonte d'écran relit ce fichier
avant d'écrire du code. On ne réinvente pas un style par page : on amende ce
fichier quand le système doit évoluer.

## Genre
Éditorial doux : un « carnet de bord calme ». Typographie porteuse (grandes
questions en Fraunces), surfaces plates, filets fins plutôt que cartes partout.
Apaisant, jamais enfantin, jamais d'effets décoratifs ni d'emojis d'interface.

## Familles d'écrans

- **App employé (`/mood`, `/team`, `/journal`, `/aide`, `/onboarding`)** :
  une seule tâche par écran. Grande question en Fraunces en haut, à gauche.
  Humeur : échelle de 5 barres (bleu profond → sauge) avec chiffre et libellé.
  Action principale : bouton pleine largeur en bas. Onglets : trait turquoise
  foncé au-dessus de l'onglet actif. Détails secondaires dans des feuilles (`Sheet`).
- **Console manager/RH (`/console/*`, bureau)** : menu latéral **bleu profond**
  (texte blanc, élément actif = fond blanc 10 % + trait turquoise à gauche),
  en-tête de page (titre Fraunces + période + actions), bande d'indicateurs
  d'un seul tenant (chiffres en Fraunces), tableaux à filets, panneaux blancs
  sans contour sur le fond bleu pâle.
- **Pages publiques** : `/login` coupé en deux sur bureau (panneau bleu profond
  avec l'accroche en Fraunces, formulaire à droite), empilé sur téléphone.
  `/legal/*`, `/conditions` : une colonne de lecture (~65 caractères).

## Couleurs (charte, hex exacts : ne pas modifier)

| Rôle | Couleur | Usage |
| --- | --- | --- |
| Bleu profond | `#123B63` | Texte principal, titres, menu de la console, panneau de connexion |
| Turquoise | `#21A6A6` | Données (graphiques, barres), accents larges ; jamais de petit texte |
| Vert sauge | `#8BC9A3` | Éléments positifs uniquement |
| Vert menthe | `#DDF3E9` | États positifs uniquement (merci, partage actif) |
| Bleu pâle | `#EAF5F8` | Fond des pages et des sections |
| Blanc | `#FFFFFF` | Surfaces (cartes, barres, feuilles) |

Teintes dérivées, uniquement pour atteindre le contraste WCAG AA :

- `brand-700` `#167B7B` : turquoise foncé pour le texte cliquable et les boutons
  (5,06:1 sur blanc, texte blanc dessus 5,06:1). Le turquoise `#21A6A6` ne porte
  jamais de petit texte (2,97:1).
- Gris (`gray-*`) teintés vers le bleu profond ; `gray-900` = `#123B63`.
  `gray-500` (texte secondaire) ≥ 4,5:1 sur blanc et sur bleu pâle.
- Verts (`emerald-*`) remappés sur la sauge : `emerald-100` = menthe,
  `emerald-500` = sauge, `emerald-600/700/800` = sauge assombrie pour le texte.
- Échelle des humeurs `mood-1` à `mood-5` : `#123B63`, `#145B6F`, `#167B7B`,
  `#21A6A6`, `#8BC9A3`. Remplace les emojis partout (`MoodPicker`, `MoodMark`).
- Rouge et ambre Tailwind conservés pour les erreurs et alertes (états, pas décor).

Tokens : `frontend/src/index.css` (`@theme`). Copie portable : `tokens.css`.

## Typographie
- **Poppins** (charte) pour toute l'interface : 400 texte, 500 libellés, 600 sous-titres.
- **Fraunces** 500 (`font-display`) uniquement pour : titres de page (h1),
  questions de l'app employé, chiffres clés (indicateurs, moyenne d'équipe),
  numéros de l'accueil. Toujours en romain, jamais d'italique.
- Échelle : h1 mobile `font-display text-[2.125rem] leading-[1.1]`, h1 console
  `font-display text-3xl lg:text-4xl`, chiffres clés `font-display text-3xl`,
  sous-titres `text-lg/semibold` (Poppins), corps `text-base`, secondaire `text-sm`.
- Chiffres tabulaires dans les tableaux et indicateurs.

## Espacement
Échelle Tailwind (multiples de 4 px). Écrans mobiles : marges latérales 20 px.
Console : 16 px (mobile) à 40 px (bureau). Entre blocs : 16 / 24 / 32 px.

## Formes
- Panneaux : `rounded-2xl` = 10 px, fond blanc, **sans contour ni ombre**.
  Les listes d'une même famille sont séparées par des filets (`divide-gray-200`).
- Boutons, puces, champs, segments : `rounded-lg` / `rounded-xl` = 8 px.
  Badges : `rounded-md` = 6 px.
- `rounded-full` réservé aux vrais cercles : points, indicateurs de chargement, interrupteurs.
- Feuilles mobiles : coins hauts 20 px, poignée visible.

## Composants signature
- **Indicateurs** : bande d'un seul tenant, chiffre en Fraunces 2 rem, tendance
  dans une pastille (`TrendChip`) : flèche + écart, rouge si baisse ≥ 0,3,
  vert si hausse ≥ 0,3, gris sinon. La valeur elle-même reste bleu profond.
- **Alerte « À surveiller »** : panneau blanc, trait ambre de 4 px à gauche,
  icône dans un carré ambre clair, bouton secondaire « Comment agir ? »,
  pistes d'action sur fond bleu pâle avec « + Publier ».
- **Menu de la console** : groupes titrés (Suivi / Équipe ou Organisation / Outils),
  avatar d'initiales en bas avec le nom et le rôle.
- **Graphe** : courbe turquoise 2,5 px + zone dégradée dessous (22 % → 0 %),
  repères d'action en points bleu profond. Pas d'animation d'entrée.
- **Envoi de l'humeur** : barre collée au-dessus des onglets, avec la mention
  d'anonymat dessous.
- **Listes déroulantes** : flèche dessinée (chevron gris), jamais le rendu natif.
- **États calmes** : « Rien d'alarmant » = panneau blanc + coche verte, pas d'emoji.

## Mouvement
- Pas de librairie. Opacité et `transform` uniquement, 150 à 260 ms, courbe `--ease-out`.
- Arrivée d'écran : `.wz-fade-in` ; feuilles : `.wz-rise`.
- Jamais de rebond. `prefers-reduced-motion` : fondu seul, ≤ 150 ms.

## Micro-interactions
- Succès silencieux (« Enregistré » en ligne), jamais de toast festif.
- Focus visible instantané : `outline-2 outline-brand-600`, jamais animé.
- Boutons désactivés : `bg-gray-300`, texte blanc ; chargement : libellé « …ant… ».

## Voix des boutons
- Principal : `rounded-lg bg-brand-700 text-white font-semibold`, verbe d'action
  (« Envoyer mon humeur », « Créer le compte »).
- Secondaire : `rounded-lg` blanc, `ring-1 ring-gray-200 text-gray-700`.
- Destructif : `rounded-lg bg-red-600`, toujours après confirmation en ligne.

## Ce que toutes les pages partagent
- Le wordmark (logo + « WorkZen » en bleu profond).
- Les couleurs de la charte et leur rôle.
- Poppins pour l'interface, Fraunces pour les titres et chiffres clés, la voix des boutons.
- Le fond bleu pâle et les surfaces blanches.

## Ce qui peut varier
- La composition à l'intérieur de chaque famille d'écrans.
- Aucune illustration ni image décorative : les écrans restent typographiques.

## Exports

### tokens.css
Voir `tokens.css` à la racine du projet.

### Tailwind v4 `@theme`
Voir `frontend/src/index.css`.
