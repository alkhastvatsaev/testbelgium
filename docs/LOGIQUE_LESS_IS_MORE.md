# Logique « less is more » — comment tu raisonnes dans cette PWA

L’objectif produit est qu’**une personne qui arrive sur l’app comprenne en moins de cinq secondes à quoi sert chaque panneau**, sans lire des paragraphes : **icônes, logos SVG, formes familières** (liste, calendrier, bouton caméra…) et **hiérarchie visuelle**. Le texte visible est **réduit au minimum** ; le détail et la lecture d’écran passent par **`aria-label`**, **`sr-only`** et les **placeholders** des champs quand il le faut.

Ce fichier décrit aussi **comment tu simplifies la chaîne technique** pour que le produit tourne, se dégrade proprement, et reste lisible.

À compléter ou corriger à la première personne si tu veux en faire **ton** manifeste.

---

## 1. Une idée centrale

Tu préfères **peu de mécanismes bien placés** à une architecture « livre blanc » : un fichier JSON ou un `try/catch` qui vide sur null peut valoir une couche d’abstraction de plus — tant que **le flux métier reste honnête** et que **l’interface ou le dispatch ne restent pas bloqués**.

### 1.1 Comprendre sans lire (signal visuel, objectif moins de cinq secondes)

Chaque **panneau** doit être identifiable tout de suite : **icône dominante + motif d’interface** (liste = missions, grille = planning, cloche = notifications, document = facture, etc.). Tu **retires les titres redondants** à l’écran quand l’icône et le contexte suffisent. Les **`aria-label`** sur les sections et boutons portent le **strict nécessaire** pour l’accessibilité, **sans doublon** avec une grosse étiquette visible. Les **champs** gardent **placeholder** ou **label sr-only** pour ne pas encombrer la vitre.

---

## 2. Ce que le code montre comme principes

### 2.1 « Ça marche même incomplet »

- **Firebase client** : un seul indicateur `isConfigured` (`projectId` présent ou non). Pas d’initialisation dans le vide : Auth / Firestore / hooks savent **s’arrêter tôt** (`features/interventions/hooks.ts`, `features/technicians/hooks.ts`, panneau entreprise).
- **Firebase Admin** : initialisation optionnelle + message ; les routes qui en ont besoin répondent **503 ou basculent** au lieu d’exploser au build (`firebase-admin.ts`, `sync-claims`).
- **Création d’intervention depuis l’audio** : tentative Firestore ; si Admin absent → **écriture disque** + réponse `storage: "disk"` pour que la carte et les listes continuent (`api/interventions/from-audio`).
- **Liste locale** : pas de dossier `uploads` → **`{ interventions: [] }`**, pas une erreur 404 métier (`api/interventions/local`).

**Pourquoi c’est « less is more »** : tu évites un graphe de dépendances « tout doit être vert ». Moins de scripts d’onboarding obligatoires, plus de **temps passé sur le produit**.

### 2.2 Le disque comme plan B explicite

- Fichiers **à côté de l’audio** : `*.intervention.json`, conventions de chemin, garde-fous **`..`** (`core/services/audio/intervention-json-path.ts`).
- Décisions audio / étapes secondaires : si une écriture Firestore échoue, **`catch` vide ou fallback fichier** plutôt que faire échouer toute la requête (`from-audio`, décisions).

**Pourquoi** : un fichier est une **preuve simple**, débogable dans l’explorateur, sans console Firebase. Tu réduis la distance entre « ça a planté » et « je vois pourquoi ».

### 2.3 Défauts lisibles plutôt que types explosifs

- Pas d’adresse géocodée → coordonnées **fallback Bruxelles** pour ne pas casser les composants carte qui attendent des nombres (`from-audio`).
- Données démo **mock** dans les hooks quand il n’y a pas de cloud ; pour les techniciens, même une **micro-simulation** (léger jitter sur `en_route`) au lieu d’un écran vide (`useTechnicians`).

**Pourquoi** : moins de `null` partout, moins de branches UI « impossible » ; tu paies un peu de réalisme pour gagner en **flux continu**.

### 2.4 Frugalité sur les coûts et les appels

- Dispatch technicien : **Haversine sur tous**, puis **Distance Matrix seulement sur le top 3** ; si Google échoue → **premier du pré-filtre** (`features/dispatch/algorithm.ts`).

**Pourquoi** : une boucle et une formule remplacent des dizaines d’appels payants — même philosophie que « pas de framework global si un contexte + un ref suffisent ».

### 2.5 État global minimal

- Pas de Redux / Zustand dans les dépendances du projet : **Context légers** (date du jour, pager à deux pages, pont carte ↔ Galaxy).
- **Pager** : un entier clampé, pas de routing Next supplémentaire pour changer de « page » (`dashboardPagerContext.tsx`).
- **Galaxy ↔ carte** : `useRef` + une fonction enregistrée — pub/sub **sans bibliothèque** (`GalaxyLayerBridgeContext.tsx`).
- Hooks **`Optional`** pour ne pas imposer toute l’arbre des providers à chaque composant.

**Pourquoi** : moins de fichiers « boilerplate », moins de sérialisation d’état ; le cerveau suit **un flux lisible**.

### 2.6 Composants qui ne font qu’un travail — parfois invisible

- **AutoProcessUploads** : `return null`, uniquement `setInterval` + `fetch` vers une route qui dépile les uploads (`AutoProcessUploads.tsx`).

**Pourquoi** : pas de panneau de réglages pour « activer le traitement » ; la complexité est **poussée hors du rendu**.

### 2.7 Routes API directes

- Corps JSON lu avec **`typeof` / gardes** et réponses `NextResponse.json` — pas de couche de validation générique partout (ex. `sms/route.ts`, plusieurs routes AI).
- **IP** : une lecture de headers, une réponse (`api/auth/ip`).

**Pourquoi** : chaque route reste **lisible d’un coup d’œil** ; tu ajoutes de la structure seulement où la complexité métier le impose.

### 2.8 Claims et tokens : formats compacts

- Custom claims entreprise : tableau de chaînes **`companyId:role`** pour rester sous les limites de taille du token (`sync-claims`).

**Pourquoi** : un tableau d’objets JSON verbeux aurait multiplié les problèmes de quota ; tu **compresses le sens** dans une convention.

### 2.9 UX de chargement : filet de sécurité simple

- **LoginOverlay** : timeout qui force `ready` après quelques secondes pour ne pas rester bloqué sur un spinner si Auth répond bizarrement.

**Pourquoi** : une constante et un `setTimeout` battent une machine à états complexe pour un cas rare.

### 2.10 Scope produit assumé sur le device

- **DesktopOnlyGate** : pas de layout responsive fragmenté pour téléphones tant que ce n’est pas prêt — un écran clair « desktop uniquement ».

**Pourquoi** : moins de CSS et de cas QA pour un public que tu ne cibles pas encore ; **moins de mensonge produit**.

---

## 3. Ce que tu évites (et que le repo ne montre presque pas)

- Global store lourd pour du state local ou dérivable.
- Validation universelle type schéma sur **chaque** petite route alors que trois `if` suffisent.
- Dépendance bloquante à un environnement cloud **pour développer le front** ou une démo.
- Abstractions « pour demain » sans besoin actuel (beaucoup de fichiers **orientés besoin concret** : audio, uploads, distance).

---

## 4. Synthèse pour un collaborateur ou une IA

Quand tu ajoutes du code ici, la question implicite semble être :

1. **Est-ce que ça tourne si Firebase / Twilio / Admin est absent ou partiel ?**
2. **Est-ce qu’un fichier ou un défaut simple évite trois couches ?**
3. **Est-ce que l’état peut rester local ou dans un petit contexte ?**
4. **Est-ce qu’on peut économiser des appels externes avec un pré-filtre gratuit ?**
5. **Un nouvel arrivant comprend-il le rôle du panneau en quelques secondes sans lire un bloc de texte (icône + layout + `aria-label` / `sr-only`) ?**

Si oui, tu es aligné avec la **logique less is more** observée dans cette PWA.

---

## 5. Lien avec les autres docs

- **`EXEMPLES_SCENARIOS.md`** — exemples concrets par page / fonctionnalité et enchaînements métier (carte, technicien, back-office, doublons, calendrier).
- **`QUI_ET_COMMENT_JE_DEV.md`** — ton style global (front + habitudes + vision).
- **`CONTEXTE_ET_FEUILLE_DE_ROUTE.md`** — vision produit multi-acteurs.
- **`STRATEGIE_EXECUTION.md`** — ordre des chantiers + **trois narratifs** friction → levier (portail client / société, technicien terrain, back-office / pilotage), alignés prompts.
- **`GUIDE_ADOPTION_NAVIGATION.md`** — comment rendre le produit **utilisable** (repères UI, formation, hub par rôle) au-delà du seul code.

*Ce document est une lecture du dépôt, pas une interview ; ajuste-le pour refléter tes intentions exactes.*
