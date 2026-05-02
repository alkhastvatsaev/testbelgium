<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing Architecture & Rules
This project follows a strict testing architecture to prevent regressions and assist AI agents in maintaining code quality. As an AI agent working on this project, you MUST adhere to the following rules:

1. **Colocated Tests (Jest)**: When you create or modify a React component or a hook in `src/features/*`, you MUST update or create the corresponding unit test in the `__tests__` folder next to it. For example, `src/features/dispatch/__tests__/algorithm.test.ts`.
2. **Use Data Test IDs**: When writing tests with React Testing Library, rely heavily on `data-testid` attributes. If an element doesn't have one and you need to interact with it, add a `data-testid`. This prevents UI changes (like Tailwind class modifications) from breaking tests.
3. **Use Provided Mocks**: Do NOT try to test the internals of third-party complex libraries like `mapbox-gl`, `firebase`, or `framer-motion`. Standard mocks for these are already set up globally in `jest.setup.ts`. Always leverage them.
4. **E2E Tests (Playwright)**: End-to-end tests live in `tests/e2e/`. Only touch these tests if you are explicitly modifying a core, critical user journey (e.g., login, dispatching an agent).
5. **Continuous Integration**: We use GitHub Actions to run typechecking (`npm run typecheck`) and Jest tests (`npm run test`) on every push and PR to the main branch. Ensure all code modifications pass these checks locally before considering a task complete.
