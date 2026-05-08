import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { DashboardPagerProvider } from "@/features/dashboard/dashboardPagerContext";

type Options = Omit<RenderOptions, "wrapper">;

/**
 * Rend un composant sous `DashboardPagerProvider` (évite de dupliquer le boilerplate dans les tests).
 */
export function renderWithPager(ui: ReactElement, pageCount = 4, options?: Options) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <DashboardPagerProvider pageCount={pageCount}>{children}</DashboardPagerProvider>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
