"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import BackOfficeDashboardPanel from "@/features/backoffice/components/BackOfficeDashboardPanel";
import {
  BACKOFFICE_HUB_ANCHOR_CALENDAR,
  BACKOFFICE_HUB_ANCHOR_DASHBOARD,
  BACKOFFICE_HUB_ANCHOR_DUPLICATES,
} from "@/features/backoffice/backofficeHubNavigation";
import InterventionCalendarPanel from "@/features/calendar/components/InterventionCalendarPanel";
import DashboardTriplePanelLayout from "@/features/dashboard/components/DashboardTriplePanelLayout";
import DuplicateAlertsPanel from "@/features/interventions/components/DuplicateAlertsPanel";
import { useDashboardPager } from "@/features/dashboard/dashboardPagerContext";

type Props = { slotIndex: number };

const railGap = "flex min-h-0 flex-1 flex-col gap-6 pb-4";

/** Page carrousel — périmètre **back-office** : doublons, tableau temps réel, calendrier. */
export default function BackOfficeHubPage({ slotIndex }: Props) {
  const humanPage = slotIndex + 1;
  const [showDevOverlay, setShowDevOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { pageIndex } = useDashboardPager();

  const isActive = pageIndex === slotIndex;

  useEffect(() => {
    setMounted(true);
  }, []);

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
            <DuplicateAlertsPanel />
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

      {showDevOverlay && mounted &&
        createPortal(
          <div 
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-500 ${
              isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={() => setShowDevOverlay(false)}
              className="absolute right-8 top-8 rounded-full bg-white/10 p-3 text-white/70 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-light tracking-wide text-white/90 drop-shadow-md">
              Développement en cours
            </h2>
          </div>,
          document.body
        )}
    </>
  );
}
