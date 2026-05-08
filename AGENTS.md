<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing Architecture & Rules
This project follows a strict testing architecture to prevent regressions and assist AI agents in maintaining code quality. As an AI agent working on this project, you MUST adhere to the following rules:

1. **Colocated Tests (Jest)**: When you create or modify a React component or a hook in `src/features/*`, you MUST update or create the corresponding unit test in the `__tests__` folder next to it. For example, `src/features/dispatch/__tests__/algorithm.test.ts`.
2. **Use Data Test IDs**: When writing tests with React Testing Library, rely heavily on `data-testid` attributes. If an element doesn't have one and you need to interact with it, add a `data-testid`. This prevents UI changes (like Tailwind class modifications) from breaking tests.
3. **Use Provided Mocks**: Do NOT try to test the internals of third-party complex libraries like `mapbox-gl`, `firebase`, or `framer-motion`. Standard mocks for these are already set up globally in `jest.setup.ts`. Always leverage them. If a test imports Firebase modules used by `src/core/config/firebase.ts` but missing from the global mock (e.g. new Firebase submodule), **extend `jest.setup.ts`** once for everyone instead of adding one-off mocks in specs.
4. **Coverage & CI**: Run `npm run test:coverage` before merging (same as CI). Global thresholds are defined in `jest.config.ts` (`coverageThreshold`). Coverage is collected from `src/**/*.{ts,tsx}` excluding `__tests__`. Raise thresholds slowly as you add tests — do not lower them without maintainer approval.
5. **Shared RTL helpers**: When a component needs `DashboardPagerProvider`, use `renderWithPager` from `src/test-utils/renderWithPager.tsx` instead of copying provider boilerplate.
6. **E2E Tests (Playwright)**: End-to-end tests live in `tests/e2e/`. Only touch these tests if you are explicitly modifying a core, critical user journey (e.g., login, dispatching an agent).
7. **Continuous Integration**: GitHub Actions runs `npm run typecheck` and `npm run test:coverage` on every push and PR to `main`. Ensure all code modifications pass `npm run test:ci` locally before considering a task complete.

## Glossaire UI — hub société (carrousel)

- **Demande express** : rail gauche du hub société (`CompanyHubPage`), composant `SmartInterventionRequestForm`. Constante `COMPANY_HUB_RAIL_DEMANDE_LABEL` dans `src/features/company/companyHubConstants.ts`. Ancre scroll : `COMPANY_HUB_ANCHOR_SMART_FORM` (`company-hub-smart-form`). `data-testid` dédié : `company-hub-rail-demande` (le triptyque garde aussi `dashboard-secondary-panel-left`).
- **Organisation** : rail central — `CompanySpacePanel`.
- **Portail client** : rail droit — `ClientPortalAuthPanel`.
