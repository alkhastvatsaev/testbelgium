import React, { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { I18nProvider } from "@/core/i18n/I18nContext";
import { DateProvider } from "@/context/DateContext";
import { CompanyWorkspaceProvider } from "@/context/CompanyWorkspaceContext";
import { DashboardPagerProvider } from "@/features/dashboard/dashboardPagerContext";
import { TechnicianQueryProvider } from "@/features/offline/TechnicianQueryProvider";
import { OfflineSyncProvider } from "@/context/OfflineSyncContext";
import { TechnicianCaseIntentProvider } from "@/context/TechnicianCaseIntentContext";
import { TechnicianFinishJobProvider } from "@/context/TechnicianFinishJobContext";
import { GalaxyLayerBridgeProvider } from "@/features/map/GalaxyLayerBridgeContext";

interface AllTheProvidersProps {
  children: ReactNode;
  pageCount?: number;
  initialPageIndex?: number;
  activeCompanyId?: string | null;
}

/**
 * Wraps children with all application providers for testing.
 */
export function AllTheProviders({ 
  children, 
  pageCount = 3,
  initialPageIndex = 0,
  activeCompanyId = null
}: AllTheProvidersProps) {
  return (
    <DateProvider>
      <I18nProvider>
        <CompanyWorkspaceProvider initialActiveCompanyId={activeCompanyId ?? undefined}>
          <GalaxyLayerBridgeProvider>
            <DashboardPagerProvider pageCount={pageCount} initialPageIndex={initialPageIndex}>
              <TechnicianQueryProvider>
                <OfflineSyncProvider>
                  <TechnicianCaseIntentProvider>
                    <TechnicianFinishJobProvider>
                      {children}
                    </TechnicianFinishJobProvider>
                  </TechnicianCaseIntentProvider>
                </OfflineSyncProvider>
              </TechnicianQueryProvider>
            </DashboardPagerProvider>
          </GalaxyLayerBridgeProvider>
        </CompanyWorkspaceProvider>
      </I18nProvider>
    </DateProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  pageCount?: number;
  initialPageIndex?: number;
  activeCompanyId?: string | null;
}

/**
 * Custom render function that includes all providers.
 */
export function renderWithProviders(
  ui: ReactElement,
  { 
    pageCount, 
    initialPageIndex,
    activeCompanyId, 
    ...options 
  }: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders 
        pageCount={pageCount} 
        initialPageIndex={initialPageIndex}
        activeCompanyId={activeCompanyId}
      >
        {children}
      </AllTheProviders>
    ),
    ...options,
  });
}

export * from "@testing-library/react";
export { renderWithProviders as render };
