"use client";
import React, { Suspense, useMemo } from "react";
import MapboxView from "@/features/map/components/MapboxView";
import SpotlightSearch from "@/features/dashboard/components/SpotlightSearch";
import ClockCalendar from "@/features/dashboard/components/ClockCalendar";
import UserProfile from "@/features/dashboard/components/UserProfile";
import LoginOverlay from "@/features/auth/components/LoginOverlay";
import MacroDroidIndicator from "@/features/dashboard/components/MacroDroidIndicator";
import AutoProcessUploads from "@/features/dashboard/components/AutoProcessUploads";
import DesktopOnlyGate from "@/features/app/DesktopOnlyGate";
import DashboardPager from "@/features/dashboard/components/DashboardPager";
import DashboardSecondaryPlaceholder from "@/features/dashboard/components/DashboardSecondaryPlaceholder";
import TechnicianHubPage from "@/features/interventions/components/TechnicianHubPage";
import { TECHNICIAN_HUB_SLOT_INDEX } from "@/features/interventions/technicianDashboardConstants";
import { DashboardPagerProvider } from "@/features/dashboard/dashboardPagerContext";
import { GalaxyLayerBridgeProvider } from "@/features/map/GalaxyLayerBridgeContext";
import DashboardGalaxyLayer from "@/features/map/components/DashboardGalaxyLayer";
import ClientPortalAuthEffects from "@/features/auth/components/ClientPortalAuthEffects";
import { DateProvider } from "@/context/DateContext";
import { CompanyWorkspaceProvider } from "@/context/CompanyWorkspaceContext";
import { TechnicianCaseIntentProvider } from "@/context/TechnicianCaseIntentContext";
import { OfflineSyncProvider } from "@/context/OfflineSyncContext";
import { TechnicianFinishJobProvider } from "@/context/TechnicianFinishJobContext";
import TechnicianConnectivityBar from "@/features/offline/components/TechnicianConnectivityBar";
import { TechnicianQueryProvider } from "@/features/offline/TechnicianQueryProvider";
import TechnicianNotificationBootstrap from "@/features/notifications/components/TechnicianNotificationBootstrap";
import DevPreviewAnonymousAuth from "@/features/dev/DevPreviewAnonymousAuth";
import { RequesterHubProvider } from "@/features/interventions/context/RequesterHubContext";
import { TechnicianBackofficeReportBridgeProvider } from "@/context/TechnicianBackofficeReportBridgeContext";

/** Écran d’accueil — **3 pages** : carte · hub société · hub technicien (back-office via inbox sur la carte). */
export default function Dashboard() {
  const dashboardPages = useMemo(
    () => [
      <>
        <MapboxView />
        <MacroDroidIndicator />
        <AutoProcessUploads />
      </>,
      <DashboardSecondaryPlaceholder key="secondary" />,
      <TechnicianHubPage key="technician-hub" slotIndex={TECHNICIAN_HUB_SLOT_INDEX} />,
    ],
    [],
  );

  return (
    <DateProvider>
      <DesktopOnlyGate>
        <LoginOverlay>
          <DevPreviewAnonymousAuth />
          <CompanyWorkspaceProvider>
            <GalaxyLayerBridgeProvider>
              <DashboardPagerProvider pageCount={dashboardPages.length}>
                <RequesterHubProvider>
                  <TechnicianQueryProvider>
                    <OfflineSyncProvider>
                      <TechnicianCaseIntentProvider>
                        <TechnicianBackofficeReportBridgeProvider>
                          <TechnicianFinishJobProvider>
                            <TechnicianConnectivityBar />
                            <Suspense fallback={null}>
                              <TechnicianNotificationBootstrap />
                            </Suspense>
                            <ClientPortalAuthEffects />
                            <DashboardPager pages={dashboardPages} />
                            {/* Bandeau global : même grille max-w + rails que le contenu (pas de `fixed` dans les enfants). */}
                            <div
                              className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center p-6 md:p-8 lg:p-12"
                              data-testid="dashboard-global-header"
                            >
                              <div className="flex w-full max-w-[1580px] items-start justify-center gap-6 lg:gap-8">
                                <div className="pointer-events-auto flex w-[380px] shrink-0 flex-col lg:w-[400px]">
                                  <ClockCalendar />
                                </div>
                                <div className="pointer-events-auto flex min-w-0 max-w-[720px] flex-1 justify-center">
                                  <SpotlightSearch />
                                </div>
                                <div className="pointer-events-auto flex w-[380px] shrink-0 flex-col lg:w-[400px]">
                                  <UserProfile />
                                </div>
                              </div>
                            </div>

                            <DashboardGalaxyLayer />

                          </TechnicianFinishJobProvider>
                        </TechnicianBackofficeReportBridgeProvider>
                      </TechnicianCaseIntentProvider>
                    </OfflineSyncProvider>
                  </TechnicianQueryProvider>
                </RequesterHubProvider>
              </DashboardPagerProvider>
            </GalaxyLayerBridgeProvider>
          </CompanyWorkspaceProvider>
        </LoginOverlay>
      </DesktopOnlyGate>
    </DateProvider>
  );
}
