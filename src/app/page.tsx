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
import BackOfficeHubPage from "@/features/backoffice/components/BackOfficeHubPage";
import { BACKOFFICE_HUB_PAGE_INDEX } from "@/features/backoffice/backofficeConstants";
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

/** Écran d’accueil — **4 pages** au total : carte · hub société · hub technicien · hub back-office. */
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
      <BackOfficeHubPage key="backoffice-hub" slotIndex={BACKOFFICE_HUB_PAGE_INDEX} />,
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
                <TechnicianQueryProvider>
                  <OfflineSyncProvider>
                    <TechnicianCaseIntentProvider>
                      <TechnicianFinishJobProvider>
                        <TechnicianConnectivityBar />
                        <Suspense fallback={null}>
                          <TechnicianNotificationBootstrap />
                        </Suspense>
                        <ClientPortalAuthEffects />
                        <SpotlightSearch />
                        <ClockCalendar />
                        <UserProfile />
                        <DashboardGalaxyLayer />
                        <DashboardPager pages={dashboardPages} />
                      </TechnicianFinishJobProvider>
                    </TechnicianCaseIntentProvider>
                  </OfflineSyncProvider>
                </TechnicianQueryProvider>
              </DashboardPagerProvider>
            </GalaxyLayerBridgeProvider>
          </CompanyWorkspaceProvider>
        </LoginOverlay>
      </DesktopOnlyGate>
    </DateProvider>
  );
}
