# Contexte produit & feuille de route — BelgMap

Document **vivant** : à mettre à jour quand une étape importante est livrée en code.  
But : garder le **fil conducteur** entre sessions (état du repo, vision, backlog détaillé).

---

## 1. État actuel du projet (référence technique courte)

> Dernière mise à jour « snapshot » : tableau de bord avec **carrousel horizontal** (carte + entreprise + plusieurs slots plein écran).

Points à retenir :

- **Next.js** + **Firebase** déjà présents dans le dépôt (Auth/Firestore selon les zones du code).
- **Page 1 (index 0)** : vue « dispatch » (carte Mapbox, missions / devis, Galaxy + transcription, etc.). Le chrome global (date/heure, recherche, profil) reste monté au-dessus du carrousel.
- **Page 2 (index 1)** : trois vitres alignées sur la géométrie de la page 1 (`dashboard-secondary-panel-left|center|right`). Le **panneau central** héberge l’**espace entreprise** (`CompanySpacePanel` : société active, invitations, sync claims). Les panneaux gauche et droit sont encore des zones vides (`DashboardTriplePanelSidePlaceholder`).
- **Pages suivantes** : slots (`DashboardPagerSlotPage`) — ex. formulaire smart intervention, portail client SSO, etc.
- **Pagination** : contexte `DashboardPager` + contrôles précédent / suivant.
- **Pont Galaxy ↔ carte** : `GalaxyLayerBridgeContext` pour la création d’interventions liée à la carte.

Ce fichier ne décrit pas ligne par ligne le code ; il sert d’**ancrage** pour savoir où on en est avant d’ajouter les prompts ci-dessous.

---

## 2. Vision produit (trois mondes)

| Acteur | Besoin principal |
|--------|-------------------|
| **Client / entreprise** | Soumettre des demandes d’intervention, suivre le statut, espace multi-utilisateur avec rôles. |
| **Technicien (ex. Mansour)** | Voir les interventions assignées, terrain rapide (QR, photos, signature), offline, notifications. |
| **Back-office (ex. Ivana + Aslanbeck)** | Pilotage temps réel, facturation bloquée par checklist, détection doublons, calendrier. |

Les prompts ci-dessous détaillent ces axes ; on les traite **étape par étape** (voir `STRATEGIE_EXECUTION.md`).

---

## 3. Backlog détaillé (prompts)

Les cases `[ ]` reflètent l’état ** produit / métier ** ; à cocher au fil des implémentations.

### 3.1 Prompts pour les Clients

- [ ] **Prompt 1 : Espace Entreprise + Rôles (Admin / Collaborateur)**

  Créer un espace multi-tenant « entreprise » dans Next.js + Firebase.

  **Exigences :**
  - À l’inscription d’une grande entreprise : document `Company` dans Firestore.
  - Plusieurs utilisateurs par société avec rôles : **Admin** et **Collaborateur**.
  - Firebase Auth + **custom claims** pour les rôles.
  - Seuls les **Admin** peuvent inviter des membres et voir la **facturation**.
  - Les **Collaborateurs** créent des demandes et ne voient que les demandes de **leur** entreprise.
  - UI avec **company switcher** si l’utilisateur appartient à plusieurs sociétés.
  - **Firestore Security Rules** : accès strict aux données de la société de l’utilisateur.

- [ ] **Prompt 2 : Smart Form (templates + Google Places + IA suggestions)**

  Formulaire moderne de demande d’intervention pour une société de serrurerie.

  **Fonctionnalités :**
  - Google Places pour l’autocomplete d’adresse.
  - Templates de problèmes courants (ex. serrure bloquée, porte blindée, clé cassée…).
  - Suggestions IA : pendant la saisie, proposer **3** problèmes pertinents (lexique serrurerie).
  - Champs : adresse, type de problème, description, urgence, upload photos/documents (drag & drop, preview, compression).
  - Brouillon auto : **localStorage** + Firestore.
  - Soumission : nouveau document **Intervention** avec statut **pending**.
  - UI soignée (**shadcn/ui**), objectif **remplissage en moins de 60 s**.

- [ ] **Prompt 3 : Magic Link + Google / Microsoft SSO**

  Auth sans mot de passe pour le portail client (Firebase).

  **Exigences :**
  - Magic Link (lien email).
  - Google Sign-In.
  - Microsoft Sign-In (optionnel mais souhaitable).
  - Après login : redirection vers le dashboard entreprise.
  - Profil utilisateur Firestore : nom, email, companyId, rôle.
  - Page de login soignée avec option **logo entreprise**.

---

### 3.2 Prompts pour le Technicien (Mansour)

- [ ] **Prompt 4 : Dashboard Technicien (simple & clair)**

  Dashboard technicien Next.js.

  **Exigences :**
  - Trois gros filtres / onglets en haut : **Aujourd’hui**, **Cette semaine**, **Toutes**.
  - Liste des interventions assignées : Case ID, nom client, adresse, statut, heure prévue.
  - Carte cliquable → vue détail du dossier.
  - Firebase Auth : uniquement les interventions assignées au technicien courant.
  - Temps réel **Firestore `onSnapshot`**.
  - Design **mobile-first** (gros boutons, zones tactiles larges).

- [ ] **Prompt 5 : QR Code + ouverture dossier en un clic**

  Scan QR pour techniciens.

  **Exigences :**
  - Dans le détail dossier : QR contenant le **Case ID**.
  - Scan caméra → ouverture automatique du dossier correspondant.
  - Saisie manuelle du Case ID possible.
  - Gros bouton flottant **Scan QR Code** sur le dashboard.

- [ ] **Prompt 6 : « Terminer l’intervention » (caméra + photos + signature)**

  Flow one-click de fin d’intervention.

  **Quand le technicien appuie sur « Terminer l’intervention » :**
  1. Ouvrir la caméra (avant / arrière).
  2. 3–4 photos avec preview + suppression possible.
  3. Puis pad de signature (**react-signature-canvas**).
  4. Signature client au doigt / stylet.
  5. Upload Firebase Storage + mise à jour du document Intervention.
  6. Checklist / statut → **completed**.
  7. Écran succès « Intervention terminée » + option facture (si admin).

  Objectif : **moins de 45 s**, flux très simple.

- [ ] **Prompt 7 : Mode offline complet + sync**

  App technicien **offline-first**.

  **Exigences :**
  - TanStack Query + Workbox pour cache / stratégie réseau.
  - Interventions assignées disponibles hors ligne.
  - Ouverture dossiers, photos, signature sans réseau.
  - Retour en ligne : sync automatique des changements vers Firestore.
  - Indicateurs **Offline** + **Synchronisation…**.
  - Gestion des conflits.

- [ ] **Prompt 8 : Push notifications + rappels**

  Notifications push technicien (FCM).

  **Exigences :**
  - Nouvelle intervention assignée → push.
  - Rappel quotidien **17:00** si interventions non terminées : « Tu as encore X interventions en cours ».
  - Clic notification → ouverture directe sur le dossier concerné.
  - FCM + service worker.

---

### 3.3 Prompts pour le Back-office (Ivana + Aslanbeck)

- [ ] **Prompt 9 : Blocage automatique + génération de facture**

  Facturation automatique avec blocage métier.

  **Exigences :**
  - Facture **uniquement** si checklist **100 %** (photos + signature présentes).
  - **Cloud Function** sur mise à jour Intervention :
    - Si `photos.length > 0` && signature présente → génération PDF facture (lib ou extension Firebase).
    - URL facture dans le document Intervention.
    - Statut → **invoiced**.
  - UI : bouton « Générer facture » désactivé + tooltip tant que checklist incomplète ; actif et vert quand prêt.

- [ ] **Prompt 10 : Dashboard temps réel Back-office**

  Tableau de bord admin temps réel.

  **Exigences :**
  - Toutes les interventions avec statuts : En attente / En cours / Terminé / Facturé.
  - Filtres : date, technicien, statut, entreprise.
  - Temps réel `onSnapshot`.
  - Clic → détail complet + historique.
  - Résumé **Activité du jour** (terminées, CA, etc.).
  - UI **shadcn/ui**.

- [ ] **Prompt 11 : Détection automatique de doublons (IA)**

  Détection intelligente des doublons.

  **Comportement :**
  - À la création d’une demande : vérifier (requête Firestore et/ou prompt IA) une demande **similaire** sur **48 h** (même adresse + description proche).
  - Si doublon potentiel → bannière back-office : « Demande similaire : Case #1234… ».
  - Admin peut **fusionner** ou **ignorer**.

- [ ] **Prompt 12 : Calendrier intégré (Google Calendar / Outlook)**

  Planification rendez-vous.

  **Exigences :**
  - Dans le détail intervention : planifier date/heure.
  - Boutons « Add to Google Calendar » et « Add to Outlook ».
  - API Google Calendar ou fichier **.ics**.
  - Vue calendrier (mois / semaine) des interventions planifiées.

---

## 4. Stack technique « moderne » (référence initiale — à réconcilier)

Tu as fourni un tableau orienté **Supabase** pour un débutant en 2026.  
**Réalité du dépôt BelgMap aujourd’hui** : **Firebase** + Next.js (voir §1).

| Couche | Option documentée (ton tableau) | Alignement avec BelgMap |
|--------|----------------------------------|--------------------------|
| Frontend | Next.js + Tailwind + shadcn/ui | Next.js + Tailwind déjà là ; shadcn à introduire progressivement. |
| Backend / DB | Supabase (Postgres + Auth + Storage + Realtime) | **Non utilisé** tant que non décidé ; équivalent cible : Firestore + Functions + Storage + Auth. |
| Auth | Supabase Magic Links + Google SSO | Équivalent Firebase : Prompt 3. |
| Offline | TanStack Query + Workbox | Prompt 7 ; compatible Firebase. |
| Notifications | Supabase Realtime + Web Push | Équivalent : FCM (Prompt 8). |
| Signature | react-signature-canvas / HelloSign | Prompt 6 (canvas simple en premier). |
| Hébergement | Vercel | Cohérent avec Next.js. |
| IA | Edge Functions + OpenAI | Équivalent possible : Cloud Functions / Route Handlers + OpenAI (Prompts 2, 11). |

**Décision à prendre explicitement** : rester sur Firebase pour tous les prompts ou migrer une partie vers Supabase. Tant que ce n’est pas écrit ici, la stratégie par défaut dans `STRATEGIE_EXECUTION.md` est **Firebase-first**.

---

## 5. Liens entre documents

| Document | Rôle |
|----------|------|
| **`CONTEXTE_ET_FEUILLE_DE_ROUTE.md`** (ce fichier) | Vision, backlog détaillé, état du projet, notes stack. |
| **`STRATEGIE_EXECUTION.md`** | Ordre des phases, dépendances entre prompts, risques — **sans implémenter**. |

En session de développement : on commence par relire **§1** et **§3** du fichier contexte, puis la stratégie pour choisir **une** prochaine étape.

---

*À compléter après chaque livraison majeure (nouvelle route, nouveau module Firebase, etc.).*
