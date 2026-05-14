"use client";

import BackOfficeDashboardPanel from "@/features/backoffice/components/BackOfficeDashboardPanel";
import {
  BACKOFFICE_HUB_ANCHOR_CALENDAR,
  BACKOFFICE_HUB_ANCHOR_DASHBOARD,
  BACKOFFICE_HUB_ANCHOR_DUPLICATES,
} from "@/features/backoffice/backofficeHubNavigation";
import InterventionCalendarPanel from "@/features/calendar/components/InterventionCalendarPanel";
import DashboardTriplePanelLayout from "@/features/dashboard/components/DashboardTriplePanelLayout";
import IncomingClientRequestsPanel from "@/features/backoffice/components/IncomingClientRequestsPanel";
import { DASHBOARD_DESKTOP_PANEL_GAP_CLASS } from "@/core/ui/dashboardDesktopLayout";

type Props = { slotIndex: number };

/** Même pas que la grille desktop — espacement inter-blocs équidistant dans chaque rail. */
const railGap = `flex min-h-0 flex-1 flex-col ${DASHBOARD_DESKTOP_PANEL_GAP_CLASS} pb-4`;


export default function BackOfficeHubPage({ slotIndex }: Props) {
  const humanPage = slotIndex + 1;

  return (
    <>
      <DashboardTriplePanelLayout
        rootTestId={`dashboard-pager-slot-${slotIndex}`}
        leftTestId={`dashboard-pager-slot-${slotIndex}-panel-left`}
        centerTestId={`dashboard-pager-slot-${slotIndex}-panel-center`}
        rightTestId={`dashboard-pager-slot-${slotIndex}-panel-right`}
        leftAriaLabel={`Page ${humanPage} — alertes`}
        centerAriaLabel={`Page ${humanPage} — dossiers`}
        rightAriaLabel={`Page ${humanPage} — agenda`}
        left={
          <section id={BACKOFFICE_HUB_ANCHOR_DUPLICATES} className={`${railGap} scroll-mt-2`}>
            <IncomingClientRequestsPanel />
          </section>
        }
        center={
          <section id={BACKOFFICE_HUB_ANCHOR_DASHBOARD} className={`${railGap} scroll-mt-2`}>
            <BackOfficeDashboardPanel />
          </section>
        }
        right={
          <section id={BACKOFFICE_HUB_ANCHOR_CALENDAR} className={`${railGap} scroll-mt-2`}>
            <InterventionCalendarPanel />
          </section>
        }
      />
    </>
  );
}
