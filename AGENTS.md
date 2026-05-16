<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing Architecture & Rules
This project follows a strict testing architecture to prevent regressions and assist AI agents in maintaining code quality. As an AI agent working on this project, you MUST adhere to the following rules:

1. **Colocated Tests (Jest)**: When you create or modify a React component or a hook in `src/features/*`, you MUST update or create the corresponding unit test in the `__tests__` folder next to it. For example, `src/features/dispatch/__tests__/algorithm.test.ts`.
2. **Use Data Test IDs**: When writing tests with React Testing Library, rely heavily on `data-testid` attributes. If an element doesn't have one and you need to interact with it, add a `data-testid`. This prevents UI changes (like Tailwind class modifications) from breaking tests.
3. **Use Provided Mocks**: Do NOT try to test the internals of third-party complex libraries like `mapbox-gl`, `firebase`, or `framer-motion`. Standard mocks for these are already set up globally in `jest.setup.ts`. Always leverage them. If a test imports Firebase modules used by `src/core/config/firebase.ts` but missing from the global mock (e.g. new Firebase submodule), **extend `jest.setup.ts`** once for everyone instead of adding one-off mocks in specs.
4. **Coverage & CI**: Run `npm run test:coverage` before merging (same as CI). Global thresholds are defined in `jest.config.ts` (`coverageThreshold`), with stricter per-folder floors for `src/features/interventions/` and `src/core/ui/`. Coverage is collected from `src/**/*.{ts,tsx}` excluding `__tests__`, with additional `collectCoverageFrom` negations in `jest.config.ts` (e.g. most Next `app/api` route handlers and a few app shells are omitted so global **function** thresholds stay meaningful). Raise thresholds slowly as you add tests — do not lower them without maintainer approval. **P0 métier** (à couvrir en priorité) : `technicianSchedule` (intake / visibilité liste), `assignInterventionToTechnician`, `technicianAssignmentActions`, `IncomingClientRequestsPanel` (assign → `status: "assigned"`), `TechnicianAssignmentOfferCard` (accepter / refuser).
5. **Shared RTL helpers**: Use `render` (alias for `renderWithProviders`) from `src/test-utils/render.tsx` for all component tests. Use `mockState` from `src/test-utils/mockState.ts` to control data/auth state. Use `renderWithPager` from `src/test-utils/renderWithPager.tsx` ONLY if the component specifically depends on `DashboardPagerProvider`.
6. **E2E Tests (Playwright)**: End-to-end tests live in `tests/e2e/`. Only touch these tests if you are explicitly modifying a core, critical user journey (e.g., login, dispatching an agent).
7. **Continuous Integration**: GitHub Actions runs `npm run typecheck` and `npm run test:coverage` on every push and PR to `main`. Ensure all code modifications pass `npm run test:ci` locally before considering a task complete. For a quick loop on one file or pattern, use `npx jest <path-or-pattern> --no-coverage` (Jest CLI args do not always pass through `npm run` the way you expect; `npx jest` is the reliable shortcut).

## Glossaire UI — hub société (carrousel)

- **Qui demande ?** : rail gauche (`CompanyHubPage`) — `RequesterProfilePanel` (`Particulier` / `Login`). Onglet Login : `ClientPortalAuthPanel` en `authRailMode` (`data-testid="requester-login-rail"`). Section `data-testid="company-hub-rail-demande"`. Ancre : `COMPANY_HUB_ANCHOR_WORKSPACE` (`company-hub-workspace`). `dashboard-secondary-panel-left`.
- **Que faut-il réparer ?** : rail central — `RequesterInterventionPanel` (`data-testid="requester-intervention-panel"`). Ancre : `COMPANY_HUB_ANCHOR_SMART_FORM` (`company-hub-smart-form`). `dashboard-secondary-panel-center`.
- **Suivi et chat** : rail droit — `data-testid="company-hub-rail-portail"` : onglets `company-hub-right-tab-tracking` / `company-hub-right-tab-chat` (`RequesterTrackingPanel`, `IvanaClientChatPanel`). `dashboard-secondary-panel-right`. (Le composant `CompanySpacePanel` reste utilisé ailleurs dans l’app, mais plus comme rail central de cette page.)
