import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { DashboardPagerProvider } from "@/features/dashboard/dashboardPagerContext";
import { I18nProvider } from "@/core/i18n/I18nContext";

type Options = Omit<RenderOptions, "wrapper">;

/**
 * Rend un composant sous `DashboardPagerProvider` (évite de dupliquer le boilerplate dans les tests).
 */
export function renderWithPager(ui: ReactElement, pageCount = 3, options?: Options) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider>
        <DashboardPagerProvider pageCount={pageCount}>{children}</DashboardPagerProvider>
      </I18nProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
