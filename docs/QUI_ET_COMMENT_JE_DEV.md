# Qui soutient ce projet et comment il est développé

Document pour **humains et assistants IA** : résume **pourquoi** tu développes ainsi (vision §2), **comment** le dépôt est construit (technique §3+), et ce que le code montre sur tes habitudes. Ce n’est pas une liste exhaustive des fichiers ; mets à jour ce fichier quand tu changes de direction importante.

---

## 1. À compléter par toi (profil personnel)

Le code ne contient pas ton nom ni ta bio. Ajoute ici ce que tu veux transmettre aux collaborateurs :

- **Nom / rôle** : …
- **Contexte** : entrepreneur solo, petite équipe, mission précise, etc.
- **Priorité produit en une phrase** : …

Tout le reste de ce document est **inféré du repo** (structure, dépendances, copies d’écran implicites dans le CSS et les libellés).

---

## 2. Vision globale : pourquoi je développe comme ça, et quel est mon style ?

> **Note honnête :** je n’ai pas accès à ta tête ni à ton histoire personnelle. Ce qui suit est une **lecture fidèle de tes choix dans le dépôt** — articulée comme une vision. Recopie-la ou réécris-la **à la première personne** (« je », « j’ai choisi… ») dans la section 1 ou ici, pour que ce soit **toi**, pas l’IA.

### 2.1 Mon style en une phrase

Tu développes comme quelqu’un qui construit un **poste de pilotage** pour un métier réel (serrurerie / interventions en Belgique) : **beaucoup d’information utile sur un grand écran**, une **carte au centre de la vérité géographique**, et une **couche visuelle soignée** (glass, blur, typo maîtrisée) qui dit « outil pro », pas « démo générique ».

### 2.2 Pourquoi — les motivations que ton code rend visibles

| Pourquoi ? | Ce que ça traduit chez toi |
|------------|----------------------------|
| **Desktop d’abord, mobile bloqué proprement** | Tu priorises l’**usage dispatch / bureau** où la densité d’info et la précision comptent. Tu préfères **ne pas livrer** une expérience téléphone bâclée qu’une fausse promesse PWA mobile. |
| **Français partout (UI + erreurs API)** | Le produit parle la **langue du terrain et du client** belge francophone. Tu évites la friction « outil tech en anglais » pour un métier local. |
| **HUD : carte plein écran, panneaux flottants** | Tu réduis la distance entre **où** ça se passe et **quoi** il faut faire. Ce n’est pas du décor : c’est une **carte cognitive** pour décider vite. |
| **Glass, gradients, Outfit** | Tu refuses le SaaS « template Tailwind sans âme ». Tu passes du temps sur le **ressenti** parce que ton utilisateur y passe ses journées. |
| **PWA, cache Mapbox, offline Firestore** | Tu anticipes **réseau capricieux** et usage prolongé : ce n’est pas une app qu’on ouvre trente secondes sur le Wi‑Fi du salon. |
| **Firebase optionnel + fallback disque / dégradé** | Tu refuses que **l’absence de secrets** ou un environnement incomplet **fige** le front ou une semaine de polish. Tu développes **avec résilience de chaîne**, pas « tout ou rien ». |
| **`features/` par domaine métier** | Tu raisonnes **en flux produit** (carte, dispatch, audio, techniciens), pas seulement en couches techniques. Ça reflète une pensée **orientée usage**, pas orientée livre de architecture. |
| **Tests colocalisés, mocks Mapbox / Firebase** | Tu as **investi du temps** sur l’interface ; tu veux **protéger** ce travail contre les régressions sans te battre avec WebGL ou Auth dans chaque test. |
| **Docs longues (`CONTEXTE`, `STRATEGIE`)** | Tu relies **vision multi-acteurs** (client / terrain / back-office) et **exécution par phases**. Tu ne codes pas que le fichier du jour : tu **cadreras** ce qui vient après. |

### 2.3 Ce que ton style refuse (implicitement)

Ce que le projet **ne fait pas** en dit autant :

- une **landing marketing** ou un dashboard vide « pour plus tard » sans carte ni métier ;
- un **anglais utilisateur** systématique pour ce produit ;
- une dépendance **totale** au cloud pour pouvoir **coder ou démo** localement ;
- des **demi-mesures mobile** (d’où le gate explicite).

*(À ajuster si une de ces lignes ne te correspond pas — c’est ton manifeste.)*

### 2.4 Synthèse « pourquoi »

En creux, tu développes pour **tenir dans la durée** : lisibilité métier, confiance visuelle, continuité hors-ligne ou degradée, et structure de code qui suit **comment tu penses le produit**. Ce n’est pas du minimalisme geek ; c’est du **travail d’outil métier** avec une **exigence esthétique**.

---

## 3. Ce que ce projet est (vu dans le code)

- **BelgMap** : PWA **Next.js** orientée **gestion d’interventions de serrurerie en Belgique** (carte, missions, techniciens, audio / IA, devis, intégrations SMS / email / paiement).
- **Langue UX** : interface et messages d’erreur API en **français** (`layout.tsx` : `lang="fr"` ; routes API avec libellés du type « fileName manquant », « Sidecar introuvable »).
- **Cible interaction principale** : expérience **desktop / grand écran** ; les téléphones Android / iPhone sont volontairement bloqués par `DesktopOnlyGate` en attendant une vraie version mobile.
- **Vision produit structurée** : répartition **clients entreprise / techniciens / back-office** décrite dans `docs/CONTEXTE_ET_FEUILLE_DE_ROUTE.md`.

---

## 4. Stack technique (choix visibles)

| Couche | Choix |
|--------|--------|
| Framework | Next.js (App Router), React 19, TypeScript |
| Style | Tailwind CSS v4 + **CSS global métier** (`globals.css`, `globals-hud.css`) |
| Carte | Mapbox GL ; tuiles mises en cache côté PWA (`next.config.ts`) |
| Auth / données | Firebase Auth + **Firestore** (avec persistence hors-ligne côté client, long polling) ; **Realtime Database** encore présente comme « ancienne base » dans `firebase.ts` |
| Serveur | Route Handlers `src/app/api/**` ; `runtime = "nodejs"` là où nécessaire ; **Firebase Admin** quand les variables sont présentes |
| Animations / UI | Framer Motion, Radix (menus), **cmdk** (palette type Spotlight), **lucide-react**, **Sonner** pour les toasts |
| PWA | `@ducanh2912/next-pwa` ; stratégie Mapbox en cache ; file API avec background sync |
| Tests | Jest + Testing Library ; Playwright en E2E ; règles dans `AGENTS.md` |

---

## 5. Ta façon de faire le front-end (patterns récurrents)

### Identité visuelle

- Police **`Outfit`** (Google Font), chargée via `next/font` avec variable CSS `--font-outfit`.
- Fond **clair premium** : `#f8fafc` + **mesh gradients** radiaux en CSS pur (`globals.css`).
- Effet **glass / premium** : panneaux semi-transparents, **backdrop-blur**, bords légers, ombres douces type `0 30px 60px -15px rgba(0,0,0,0.1)` et inset highlight — visible dans `SpotlightSearch`, mode HUD (`globals-hud.css`), classes `.dashboard-panel`.

### Layout produit

- Tableau de bord en **mode HUD** : carte **plein écran**, autres panneaux **flottants** avec géométrie fixe (IDs `#step-technicians`, `#step-interventions`, etc.).
- Tu mixes volontairement :
  - **Classes sémantiques globales** (`.dashboard-layout`, `.dashboard-panel`, `.panel-title`, `.stats-grid`, `.list-item`…) pour la cohérence « dashboard métier » ;
  - **Utilitaires Tailwind** très précis sur les composants récents (fixed, z-index, `rounded-[24px]`, opacités).

### Motion et densité

- **Framer Motion** pour les transitions modales / overlays (ex. recherche).
- Objectif implicite : interface **dense mais lisible**, ton « cockpit » plutôt qu’une landing générique.

### Ce qui « doit » matcher quand on ajoute une fonctionnalité

Pour qu’un nouveau panneau **semble à la maison** dans ta PWA :

1. Même **famille visuelle** : blur + blanc translucide + coins arrondis **24px** (ou alignés sur le HUD).
2. **Outfit** pour le texte important si tu forces une police inline.
3. Libellés et aide contextuelle en **français clair**, comme sur le reste de l’app.
4. Préférer **`data-testid`** sur les zones interactives si le composant vit sous `src/features/*` (exigence tests du projet).

---

## 6. Ta façon de faire le back-end et la donnée

### Routes API

- Style **pragmatique** : `POST` / `GET` avec **`NextResponse.json`**, codes HTTP explicites, corps typés avec **gardes** (`typeof … === "string"`) plutôt que zod systématique partout.
- Beaucoup de logique **métier et fichier** vit sous `src/core/services/**` (audio, uploads, sidecars, décisions) — les routes restent **fines** et appellent ces services.

### Résilience / développement local

- Pattern récurrent : **essayer Firestore Admin** ; si non configuré, **fallback disque ou comportement dégradé** pour que l’UI continue (ex. `from-audio/route.ts`).
- Géocodage **Mapbox** avec `country=be` et `language=fr` quand une adresse est résolue.

### Firebase client

- **`isConfigured`** dérivé de `projectId` : évite d’initialiser Firebase dans le vide et permet aux hooks de **court-circuiter** proprement (mock données, pas d’`onAuthStateChanged` invalide).
- Commentaires en français sur les choix (long polling Vercel, persistence multi-onglet).

### Sécurité et règles

- Firestore rules et Admin SDK sont des **points sensibles** : tout nouveau domaine métier doit rester aligné avec **qui peut lire quoi** (voir discussions dans ta feuille de route entreprise).

---

## 7. Organisation du code (comment tu structures le repo)

- **`src/app/`** : `layout`, `page`, routes API uniquement.
- **`src/features/<domaine>/`** : fonctionnalités par **vertical métier** (`dashboard`, `map`, `dispatch`, `interventions`, `technicians`, `auth`, `company`, etc.) avec composants et parfois `hooks.ts`, `types.ts`, `__tests__/`.
- **`src/core/`** : configuration (`config/`), UI réutilisable minimale (`core/ui/`), **services** transverses (`core/services/`).
- **`src/context/`** : providers React transverses (`DateContext`, etc.).
- **`docs/`** : vision long terme (`CONTEXTE_ET_FEUILLE_DE_ROUTE.md`), exécution (`STRATEGIE_EXECUTION.md`), et ce fichier.

Import alias **`@/`** vers la racine `src/`.

---

## 8. Tests et qualité (contrat du projet)

Résumé aligné sur `AGENTS.md` :

- Tests **colocalisés** avec les features.
- **`data-testid`** pour stabiliser RTL face aux changements Tailwind.
- **Mocks globaux** pour Mapbox, Firebase, Framer Motion dans `jest.setup.ts` — ne pas « tester la lib », tester **ton comportement**.
- E2E réservées aux **parcours critiques**.
- CI : `npm run typecheck` + `npm run test`.

---

## 9. Écart possible entre une nouvelle fonction et « ton » univers

Si une fonctionnalité ajoutée par un tiers **ne colle pas**, elle brise souvent une de ces règles implicites :

1. **Visuel** : palette / blur / coins / typo différents du reste du dashboard.
2. **Langage** : jargon technique visible utilisateur final sans passer par le ton français métier habituel.
3. **Donnée** : nouveau flux sans le même **fallback** (Firebase absent, pas de mock, pas de message clair).
4. **Placement UX** : écran qui ignore le **HUD** (z-index, fixed, chrome déjà présent sur la page 1).

Quand tu ajoutes une brique, demande : « Est-ce que ça ressemble à **Spotlight / HUD / MapboxView** et est-ce que ça se comporte comme **mes routes API** ? » — si non, c’est normal que ça « jure ».

---

## 10. Maintien de ce document

- Mets à jour les **sections 1 et 2** quand ta vision personnelle évolue ou que tu présentes le projet à quelqu’un (pour que ce ne soit pas que de l’inférence).
- Ajoute une ligne dans **section 9** si tu fixes une **nouvelle règle de maison** (ex. « tous les nouveaux panneaux passent par telle primitive UI »).

*Généré à partir de l’analyse du dépôt ; les intentions produit détaillées restent la référence dans `CONTEXTE_ET_FEUILLE_DE_ROUTE.md`.*
