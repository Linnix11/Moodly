# WorkZen (projet MOODLY)

**MOODLY** est le nom du sujet du projet étudiant : une app de suivi **anonyme** du moral des équipes.
**WorkZen** est le nom du produit que nous avons construit pour y répondre.

- **Employés** (app web pensée pour le téléphone) : humeur du jour en 10 secondes, météo de l'équipe, journal privé (dans le navigateur uniquement), avis anonymes sur les actions du manager, demande d'échange (« Besoin d'en parler ? »).
- **Managers et RH** (console web `/console`) : moral sur 30 à 180 jours (un seul graphe), sujets, actions avec statut et échéance, demandes d'échange, fiches conseil, export PowerPoint.

## Règles d'anonymat (appliquées côté SQL)

1. Aucune humeur ni réaction n'est liée à un utilisateur en base. Un questionnaire ne l'est que si le salarié choisit, à la question 4, d'en parler à son manager ou aux RH : il est alors transmis avec son nom (fiche et historique par salarié, console « Fiches salariés »), et sorti des statistiques anonymes. Un salarié peut aussi activer « Partager mes réponses avec mon manager » (désactivé par défaut, révocable : le retrait supprime ce qui a été partagé) ; son manager voit alors ses humeurs et questionnaires dans « Mon équipe ». Le seuil de 3 ne compte que les réponses anonymes.
2. Aucun agrégat sous **3 réponses** (jour, sujet, vote, questionnaire).
3. Journées **closes** uniquement : pour aujourd'hui, seul le nombre de réponses est visible.
4. Une équipe de **moins de 3 employés** a toutes ses statistiques masquées.
5. Une demande d'échange ne contient que le nom, un sujet facultatif et la **semaine** : jamais de note ni de date exacte.

## Informations légales

Pages publiques sous `/legal` : mentions légales, CGU, CGV, politique de confidentialité, cookies.
Liens en bas de la page de connexion, dans l'en-tête de l'app (icône balance) et dans le menu de la console.

- À la première connexion, chaque compte doit accepter les CGU (`/conditions`) ; la version et la date sont enregistrées dans `profiles`.
- Les textes sont dans `frontend/src/lib/legal.ts`. Les passages `[À COMPLÉTER : …]` (raison sociale, SIREN, hébergeur, tarifs…) sont surlignés à l'écran tant qu'ils ne sont pas remplis.
- Modifier un texte de fond : changer `LEGAL_VERSION` dans ce fichier, ce qui redemande l'acceptation à tout le monde.
- Ces textes sont un modèle : à faire relire par un juriste avant une vraie mise en production.

## Installation

### 1. Supabase

Dans **SQL Editor**, exécuter dans l'ordre :

1. `supabase/migrations/20261013000000_init.sql`
2. `supabase/migrations/20261014000000_reports.sql`
3. `supabase/migrations/20261015000000_features_v2.sql`
4. `supabase/migrations/20261016000000_console_web.sql`
5. `supabase/migrations/20261017000000_v3.sql`
6. `supabase/migrations/20261018000000_legal.sql` (acceptation des CGU)
7. `supabase/migrations/20261019000000_report_comments.sql` (commentaire libre du questionnaire)
8. `supabase/migrations/20261020000000_shared_reports.sql` (questionnaires partagés avec son nom, fiches salariés)
9. `supabase/migrations/20261021000000_team_sharing.sql` (partage volontaire avec le manager, page « Mon équipe »)
10. `supabase/migrations/20261022000000_custom_topics.sql` (sujets créés par les RH et les managers)

### 2. Création des comptes par la RH (Edge Function)

Pour que la RH puisse créer des comptes depuis la console (« Personnes » > « Nouveau compte ») :
**Edge Functions > Deploy a new function > Via Editor**, nommer la fonction `rh-create-user`,
coller `supabase/functions/rh-create-user/index.ts` puis **Deploy** (laisser « Verify JWT » activé).
Puis **Edge Functions > Secrets** : ajouter `WORKZEN_SECRET_KEY` = la clé secrète (`sb_secret_...`, Project Settings > API Keys).
La clé reste côté serveur (jamais dans `.env` ni dans le dépôt) : la fonction vérifie que l'appelant est RH avant de créer le compte.
Avec la CLI : `supabase functions deploy rh-create-user`.

### 3. Comptes de démo

Dans **Authentication > Users > Add user** (cocher « Auto confirm user »), créer :

- `manager@workzen.dev` : le manager de démo ;
- **au moins 5 employés** `@workzen.dev` (par exemple `lea@`, `antoine@`, `sarah@`, `tom@`, `ines@`).
  En dessous de 3 employés, les statistiques de l'équipe sont masquées par conception ;
- `rh@workzen.dev` (facultatif) : le compte RH de démo, passé en RH par `seed.sql`.
  Il ouvre la console RH (`/console`) : stats de toutes les équipes filtrables par équipe, statut et manager ;
  gestion des rôles et des équipes (« Personnes », « Équipes »).

### 4. Données de démo

1. `supabase/seed.sql` : crée l'« Équipe Produit », donne le rôle manager et rattache les comptes `@workzen.dev`.
2. `supabase/reset_demo.sql` : génère 60 jours cohérents (au plus une réponse par employé et par jour, quelques journées creuses), 3 actions avec statut, des avis anonymes et des questionnaires.
   **Relançable à volonté** pour repartir d'une démo propre. Il ne touche ni aux comptes ni au schéma.

### 5. Tests de sécurité

Exécuter `supabase/tests/security_tests.sql` : chaque test affiche une ligne ✅ (27 au total).
Seule la ligne `pg_temp.demo_manager()` est à adapter si le manager de démo n'est pas `manager@workzen.dev`.

### 6. Front

```bash
cd frontend
cp .env.example .env   # VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (clé « publishable », jamais la clé secrète)
npm install
npm run dev            # http://localhost:5173 (console : /console)
```
