# Stratégie d’exécution — BelgMap (plan de travail, sans implémentation)

Ce fichier décrit **comment** avancer prompt par prompt. Il ne remplace pas `CONTEXTE_ET_FEUILLE_DE_ROUTE.md` : celui-ci porte la vision et le backlog ; celui-ci porte l’**ordre**, les **dépendances** et les **garde-fous**.

**Règle** : une étape à la fois ; livrer une vertical slice testable avant d’en empiler une autre.

---

## 1. Hypothèse stack (par défaut)

Tant que tu ne décides pas explicitement de migrer vers Supabase :

- **Firebase** : Auth (claims / SSO selon prompt), Firestore (données métier), Storage (médias, signatures), Cloud Functions (facturation, triggers), FCM (push technicien).
- **Next.js** : App Router, routes séparées ou sous-layouts pour Client / Technicien / Back-office quand la taille du code l’exigera.
- **Qualité** : tests colocalisés, `data-testid`, CI existante — maintenus à chaque incrément.

Si tu choisis Supabase pour une partie des prompts, il faudra **une décision documentée** dans `CONTEXTE_ET_FEUILLE_DE_ROUTE.md` (§4) avant de coder la migration.

---

## 2. Principes de stratégie

| Principe | Application |
|----------|-------------|
| **Sécurité et données en premier** | Modèle Firestore + Security Rules avant les grosses UIs publiques multi-tenant. |
| **Un flux utilisateur bout-en-bout par tranche** | Ex. « création intervention client → visible back-office » avant polish IA ou calendrier. |
| **Séparer les surfaces** | Client / Technicien / Admin peuvent partager des libs mais pas les mêmes pages sans garde d’auth et de rôle. |
| **Offline et push en phase tardive** | Ils dépendent d’un modèle de données et de flux réseau déjà stables (Prompts 7–8 après 4–6). |
| **shadcn/ui** | À introduire de façon incrémentale (formulaires client / back-office) pour éviter une refonte massive d’un coup. |

---

### Narratif friction → levier (référence produit)

Tableau de synthèse : **la friction utilisateur**, le **levier moderne** (type « one-click » ou équivalent), l’**effet** attendu. À garder aligné avec `CONTEXTE_ET_FEUILLE_DE_ROUTE.md` et les prompts numérotés.

| Friction | Levier moderne | Effet attendu |
|----------|----------------|---------------|
| Plusieurs personnes envoient la même demande / pas de cadre commun | **Espace société** multi-utilisateurs (**Admin / Collaborateur**), périmètre `companyId` + flux dédiés aux doublons | **Moins de doublons** et moins de reprise manuelle côté dispatch |
| Formulaire long et répétitif | **Smart form** : **modèles** (« Porte bloquée », etc.), **Google Places** autocomplete, **suggestions IA** sur la problématique (« problème courant : clé bloquée ») | **~3× plus rapide** à saisir une demande exploitable |
| Envoi de documents / photos pénible | **Glisser-déposer**, **aperçu** avant envoi, **compression automatique** côté client quand pertinent | Parcours **plus agréable** et moins d’échecs réseau |
| Connexion à chaque visite | **Magic link** (lien e-mail = session sans mot de passe) **+** **Google / Microsoft SSO** | **Friction quasi nulle** à l’entrée du portail client / société |

**Liens directs avec les phases ci-dessous (ordre indicatif)** : isolation tenant + rôles (Prompt **1**, Phase 0) ; formulaire intelligent + Places + IA (Prompt **2**, Phase 1) ; médias terrain et pièces jointes riches (Prompt **6**, Phase 2) ; auth Magic Link + SSO (Prompt **3**, Phase 1) ; détection / fusion doublons (Prompt **11**, Phase 3).

Ce narratif **ne remplace pas** les phases §3 : il explique **pourquoi** ces chantiers sont prioritaires en langage métier.

---

### Narratif technicien terrain (référence produit)

Même logique **friction → levier → effet**, focalisée sur **voir ses interventions**, **ouvrir le bon dossier**, **clôturer avec preuves**, **réseau absent**, **rien oublier**.

| Friction | Levier moderne | Effet attendu |
|----------|----------------|---------------|
| Voir ses interventions sans se perdre | **Tableau de bord ultra-simple** : **trois gros blocs** — **Aujourd’hui** / **Cette semaine** / **Tout** | **Clarté immédiate** : où en est la journée sans fouiller |
| Retrouver le bon dossier sur place | **QR Code** sur la porte ou sur **l’ordre de travail** → **scan = ouverture directe** du dossier concerné | **Zéro recherche** dans une longue liste |
| Photos + signature longues ou oubliées | Gros bouton **« Terminer l’intervention »** → **caméra** (prise de photos fluide) → **signature à l’écran** → validation en **~45 s** | Parcours **extrêmement simple** pour une preuve complète |
| Pas de réseau sur le chantier | **Mode hors-ligne** : saisie locale, **re-sync automatique** au retour du réseau | **Ça marche partout** ; pas de blocage terrain |
| Photos / signature oubliées en fin de journée | **Notification push** + **checklist bloquante** (items obligatoires) + **rappel** (ex. **30 min avant fin de journée**) | **Plus d’oublis** systématiques sur les preuves |

**Liens directs avec les phases §3** : liste / temps réel technicien (**Prompt 4**, Phase 2) ; accès QR (**Prompt 5**) ; clôture médias + signature (**Prompt 6**) ; offline-first (**Prompt 7**, après stabilité du flux en ligne) ; FCM + règles de rappel (**Prompt 8**).

---

### Narratif back-office / pilotage (référence produit)

Friction → levier → effet pour **dispatch, facturation et visibilité** (sans courir après les techniciens ni refaire la paperasse).

| Friction | Levier moderne | Effet attendu |
|----------|----------------|---------------|
| Perdre du temps à **relancer les techniciens** pour les preuves | **Verrouillage automatique** : la **facture reste bloquée** tant que **photos + signature** ne sont pas validées (checklist métier) | **Plus de traque** : le système impose le complet avant facturation |
| **Facturation manuelle** longue et source d’erreurs | **Génération automatique de la facture** dès que la **checklist est 100 % complète** (et garde-fous métier respectés) | **Gain de temps massif** côté admin |
| Suivi des demandes **opaque** ou retardé | **Tableau de bord temps réel** : statuts vivants (**En attente** / **En cours** / **Terminé**) **+ filtres** sur le périmètre société | **Visibilité totale** sur le flux |
| **Demandes en double** (même client / même adresse / même problème) | **Détection automatique des doublons** **+ alertes** (y compris suggestions **IA** si une demande très proche existe déjà) | **Moins de confusion** et moins de missions doublonnées |
| **Planifier** les passages (appelez-moi quand…) sans lien avec l’agenda | **Calendrier intégré** avec synchronisation **Google Calendar** / **Outlook**, actions depuis le **portail** (création / mise à jour de créneaux selon le modèle retenu) | **Fluidité** pour l’ordonnancement et la relation client |

**Liens directs avec les phases §3** : facturation conditionnelle aux preuves (**Prompt 9**, Phase 3 — après **Prompt 6**) ; vue globale temps réel (**Prompt 10**) ; alertes et fusion doublons (**Prompt 11**) ; calendrier et intégrations agenda (**Prompt 12**). Le **Prompt 1** (tenant / rôles) reste le socle pour filtrer tout ce périmètre par `companyId`.

---

## 3. Phases proposées (ordre logique)

Les numéros de prompts correspondent au fichier de contexte.

### Phase 0 — Fondations produit & données (court terme)

**Objectif** : tout le monde parle le même langage métier dans Firestore.

- Définir les collections minimales : `companies`, `users` (profil app), `interventions` (champs statut, companyId, assignedTechnicianId, etc.), pièces jointes référencées dans Storage.
- **Prompt 1** en premier : sans multi-tenant et claims, les Prompts 2–3 et une partie du back-office restent ambigus.

**Livrable** : création société + utilisateurs + rules de base testées (émulateur ou environnement dev).

### Phase 1 — Portail client (valeur métier rapide)

- **Prompt 3** (auth Magic Link + SSO) **ou** **Prompt 2** (formulaire) selon priorité :
  - Si tu veux des utilisateurs réels tout de suite → **3 puis 2**.
  - Si tu veux déjà des données « intervention » en base sans SSO complexe → **2 avec auth minimale**, puis **3**.
- **Prompt 2** inclut Places + brouillon + création `Intervention` — parfait pour alimenter le back-office plus tard.

**Livrable** : un client peut soumettre une demande liée à une `companyId`.

### Phase 2 — Technicien : lecture et action terrain

- **Prompt 4** : liste assignée + temps réel + mobile-first.
- **Prompt 5** : QR pour réduire la friction d’accès au dossier.
- **Prompt 6** : clôture avec médias + signature (bloque la facturation plus tard).

**Livrable** : boucle « voir mission → ouvrir → terminer avec preuves ».

### Phase 3 — Back-office pilotage

- **Prompt 10** : vue globale + filtres + temps réel (consomme le même modèle Intervention).
- **Prompt 9** : facturation automatique une fois les statuts / checklist stabilisés (après 6).
- **Prompt 11** : doublons — après volume de données ou en parallèle tardif.
- **Prompt 12** : calendrier — souvent après stabilité des dates dans le modèle métier.

### Phase 4 — Robustesse terrain et engagement

- **Prompt 7** : offline-first — **après** que le flux en ligne (4–6) soit validé ; sinon double travail.
- **Prompt 8** : FCM — après identification des événements métier déclencheurs (assignation, rappel 17h).

---

## 4. Matrice de dépendances (résumé)

```
Prompt 1 (tenant + rôles)
    └── 2, 3, 10 (filtre entreprise, billing admin)

Prompt 2 (formulaire)
    └── 10, 11 (liste admin, doublons)

Prompt 3 (auth client)
    └── 2 (accès dashboard entreprise)

Prompt 4 (dashboard tech)
    └── 5, 6, 7, 8

Prompt 6 (photos + signature)
    └── 9 (facturation conditionnelle)

Prompt 10 (admin liste)
    └── 9, 11, 12 (enrichissement)
```

---

## 5. Comment je consulterai ces fichiers en session

1. **Toujours** : `CONTEXTE_ET_FEUILLE_DE_ROUTE.md` §1 pour l’état réel du code ; §3 pour le détail du prompt concerné.
2. **Ce fichier** : pour décider « par quoi continuer » et éviter de coder Prompt 8 avant Prompt 4 sans décision explicite.
3. **`EXEMPLES_SCENARIOS.md`** : pour décrire ou tester un parcours utilisateur bout-en-bout (ex. demande page 3 → doublon page 12 → fusion page 11).
4. **`GUIDE_ADOPTION_NAVIGATION.md`** : pour tout ce qui touche **lisibilité produit**, formation et mise en service — pas seulement la roadmap technique.
5. Après chaque merge significatif : proposition de mise à jour de §1 (état actuel) — soit par toi, soit demandée explicitement à l’agent.

---

## 6. Risques connus à anticiper

| Risque | Mitigation |
|--------|------------|
| Firebase Rules complexes multi-tenant | Écrire des tests rules (émulateur) ; garder les rôles dans claims à jour. |
| Offline + sync (7) | Stratégie de version / horodatage ; files d’attente idempotentes ; pas de sync avant modèle stable. |
| IA suggestions + doublons (2, 11) | Budget tokens, latence, confidentialité ; fallback sans IA au début. |
| Douleur UX « trois apps » dans un seul repo | Route groups `/client`, `/technician`, `/admin` + middleware auth ; mutualiser design tokens. |
| Tableau Supabase vs Firebase | Décision unique dans le doc contexte ; éviter deux backends sans boundary claire. |

---

## 7. Prochaine micro-action suggérée (à valider avec toi)

La **page 2** du carrousel a déjà un écran métier au centre : **`CompanySpacePanel`** (espace entreprise). Les prochaines évolutions typiques sont soit :

- **A.** Renforcer le **modèle Firestore + isolation tenant** (Prompt 1 / rules / claims), soit  
- **B.** Enrichir les **panneaux latéraux vides** de la page 2, soit déplacer des parcours métier vers les **slots** (pages 3+).

À trancher selon ta priorité business : **identité & isolation des données** (A) vs **prototype visible** (B).

---

*Ce document est un plan stratégique ; aucune implémentation n’est engageante tant que les prompts ne sont pas traités un par un dans le code.*
