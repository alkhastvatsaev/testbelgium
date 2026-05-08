# Checklist — nouveau panneau (dashboard / features)

À réutiliser pour **chaque panneau** que tu ajoutes (ex. tes 11 prochains), pour ne rien oublier côté app, sécurité et CI.

---

## 1. Emplacement et composition

- [ ] Composant sous `src/features/<domaine>/components/` (ou dossier cohérent avec le reste du domaine).
- [ ] Si le panneau lit ou écrit des **données « société »** (interventions, membres, facturation, etc.) : utiliser le bon hook :
  - **`useCompanyWorkspace()`** — uniquement sous un arbre déjà enveloppé par **`CompanyWorkspaceProvider`** (déjà sur le dashboard dans `src/app/page.tsx`).
  - **`useCompanyWorkspaceOptional()`** — dans du code pouvant tourner **sans** provider (hooks partagés, tests) ; comportement « interne » si `null`.
- [ ] Points d’entrée utilisateur importants : **`data-testid`** sur le conteneur du panneau et sur les boutons/champs que les tests doivent cibler.

---

## 2. Données Firestore et isolation tenant

- [ ] Toute donnée **scoped entreprise** doit porter un **`companyId`** (et **`createdByUid`** sur création côté client si les règles l’exigent).
- [ ] Requêtes Firestore : filtrer avec **`where('companyId', '==', activeCompanyId)`** pour les utilisateurs tenant (cf. `useInterventions`).
- [ ] Nouvelle **collection** ou nouveau chemin ? Mettre à jour **`firestore.rules`** puis déployer :
  ```bash
  firebase deploy --only firestore:rules
  ```
- [ ] Rappel : les comptes **portal** doivent avoir des **custom claims** à jour (**`bmTenants`**, **`bmActive`**) via `/api/company/sync-claims` — sinon le serveur / les règles peuvent les traiter comme « internes ».

---

## 3. Routes API (`src/app/api/...`)

- [ ] Si le corps ou les effets dépendent de l’utilisateur ou de la société : vérifier le **`Authorization: Bearer <idToken>`** et, si besoin, **`companyId`** + adéquation membership (Admin SDK).
- [ ] Réponses d’erreur claires (**403** si société refusée, **401** si non authentifié).

---

## 4. Intégration UI (dashboard secondaire, onglets, etc.)

- [ ] Brancher le panneau là où tu veux l’afficher (ex. `DashboardSecondaryPlaceholder`, pager, layout existant).
- [ ] **Carousel plein écran** (`DashboardPager`) : les écrans sont définis dans **`src/app/page.tsx`** (`dashboardPages`). Tu peux remplacer un `DashboardPagerSlotPage` par ton composant, ou insérer une nouvelle entrée et faire suivre **`pageCount`** (`dashboardPages.length` via le provider).
- [ ] Vérifier que l’arbre React inclut les **providers** nécessaires (au minimum `CompanyWorkspaceProvider` est déjà sur la page principale pour les enfants de `LoginOverlay`).

---

## 5. Tests (obligatoire dans ce repo)

- [ ] Fichier **`__tests__/*.test.tsx`** (ou `.ts`) **à côté** du composant / hook modifié.
- [ ] Si le composant appelle **`useCompanyWorkspace()`** sans optional : envelopper le **`render()`** avec **`CompanyWorkspaceProvider`** dans le test (voir `CompanySpacePanel.test.tsx`).
- [ ] Préférer **`getByTestId`** / **`getByRole`** aux sélecteurs fragiles (classes Tailwind).
- [ ] Ne pas mocker l’intérieur de Mapbox / Firebase au-delà de ce qui existe déjà dans **`jest.setup.ts`**.
- [ ] Avant commit / PR :
  ```bash
  npm run typecheck && npm run test
  ```

---

## 6. E2E (Playwright)

- [ ] Ne toucher **`tests/e2e/`** que si tu modifies un **parcours critique** (connexion, dispatch majeur, etc.). Sinon ignorer.

---

## 7. Mini récap « copier-coller » avant de fermer une PR panneau

| Étape | Fait ? |
|--------|--------|
| `data-testid` utiles | ☐ |
| Tenant / `companyId` si données métier | ☐ |
| `firestore.rules` si nouvelle surface données | ☐ |
| API sécurisée si nouvelle route | ☐ |
| Test colocalisé + provider si besoin | ☐ |
| `typecheck` + `test` verts | ☐ |

Tu peux dupliquer la section **7** en tête de ticket ou PR pour tes 11 panneaux.
