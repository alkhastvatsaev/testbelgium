<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing Architecture & Rules
This project follows a strict testing architecture to prevent regressions and assist AI agents in maintaining code quality. 

As an AI agent working on this project, you **MUST** read the `TESTING_CODEX.md` file located at the root of the project BEFORE attempting to write or modify any tests. The CODEX acts as the single source of truth for test placement, mocking strategies, component selection, and test coverage requirements.

GitHub Actions runs `npm run typecheck`, `npm run test`, and `npm run test:e2e` on pushes and PRs to `main`.

## Where to add tests (quick reference)

| You change… | Add or update… |
|-------------|----------------|
| Component or hook under `src/features/**` | Colocated `__tests__/*.test.tsx` / `*.test.ts` (Jest + RTL) |
| Pure logic under `src/core/**` | Colocated `__tests__`; prefer testing extracted helpers over route internals |
| App Router API route with non-trivial branching | Prefer moving logic to `src/core` + unit tests; optional route-focused test if orchestration must stay put |
| Critical user journey (login, dispatch, upload) | `tests/e2e/*.spec.ts` (Playwright) — keep the suite small and stable |

**Scripts**: `npm run test` (unit), `npm run test:coverage` (coverage report), `npm run test:e2e` (Playwright headless), `npm run test:e2e:ui` (Playwright UI mode).

# Glossaire UI (Terminologie de Référence)
Ce lexique définit les termes spécifiques à utiliser lors des modifications de l'interface pour garantir la cohérence entre les sessions et les différents agents/IDE.

| Terme | Définition | Composant Source |
|-------|------------|------------------|
| **Transcription Scrim** | Le dégradé sombre (gradient) qui s'affiche sur la carte pour assurer la lisibilité de la transcription. | `MapTranscriptionOverlay.tsx` |
| **Galaxy Button** | Le bouton central principal gérant l'état de l'assistant et de l'audio. | `GalaxyButton.tsx` |
| **Actions Panel** | Le panneau latéral d'édition des fiches d'intervention générées. | `MapTranscriptionActionsPanel.tsx` |

