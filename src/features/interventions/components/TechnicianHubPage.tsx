"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardTriplePanelLayout from "@/features/dashboard/components/DashboardTriplePanelLayout";
import TechnicianDashboardListPanel from "@/features/interventions/components/TechnicianDashboardListPanel";
import TechnicianDashboardDetailPanel from "@/features/interventions/components/TechnicianDashboardDetailPanel";
import TechnicianDashboardImagesPanel from "@/features/interventions/components/TechnicianDashboardImagesPanel";
import { useTechnicianCaseIntent } from "@/context/TechnicianCaseIntentContext";
import {
  TECHNICIAN_HUB_ANCHOR_MISSIONS,
} from "@/features/interventions/technicianHubNavigation";
import { useTechnicianAssignments } from "@/features/interventions/useTechnicianAssignments";
import { interventionMatchesTab, sortInterventionsByScheduleAsc } from "@/features/interventions/technicianSchedule";
import { useDashboardSelectedDate } from "@/context/DateContext";
import { auth } from "@/core/config/firebase";
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";

type Props = { slotIndex: number };

/**
 * Une page carrousel = tout le poste **technicien** : Ma Journée (gauche), missions (centre),
 * photos client (droite).
 */
export default function TechnicianHubPage({ slotIndex }: Props) {
  const humanPage = slotIndex + 1;
  const { pendingCaseId, setPendingCaseId } = useTechnicianCaseIntent();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { interventions } = useTechnicianAssignments();
  const dashboardSelectedDate = useDashboardSelectedDate();

  const tabAnchorDate = useMemo(() => {
    const previewAnonymous =
      devUiPreviewEnabled &&
      (!auth || !auth.currentUser || auth.currentUser.isAnonymous);
    return previewAnonymous ? dashboardSelectedDate : new Date();
  }, [dashboardSelectedDate]);

  const filteredSorted = useMemo(() => {
    const matched = interventions.filter((iv) => interventionMatchesTab(iv, "today", tabAnchorDate));
    return sortInterventionsByScheduleAsc(matched);
  }, [interventions, tabAnchorDate]);

  useEffect(() => {
    if (pendingCaseId) {
      setSelectedCaseId(pendingCaseId);
      setPendingCaseId(null);
    } else if (!selectedCaseId && filteredSorted.length > 0) {
      setSelectedCaseId(filteredSorted[0].id);
    }
  }, [pendingCaseId, setPendingCaseId, selectedCaseId, filteredSorted]);

  return (
    <DashboardTriplePanelLayout
      rootTestId={`dashboard-pager-slot-${slotIndex}`}
      leftTestId={`dashboard-pager-slot-${slotIndex}-panel-left`}
      centerTestId={`dashboard-pager-slot-${slotIndex}-panel-center`}
      rightTestId={`dashboard-pager-slot-${slotIndex}-panel-right`}
      leftAriaLabel={`Page ${humanPage} — technicien : ma journée`}
      centerAriaLabel={`Page ${humanPage} — technicien : missions`}
      rightAriaLabel={`Page ${humanPage} — technicien : photos`}
      left={
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
          <TechnicianDashboardListPanel selectedCaseId={selectedCaseId} onSelect={setSelectedCaseId} />
        </div>
      }
      center={
        <section id={TECHNICIAN_HUB_ANCHOR_MISSIONS} className="scroll-mt-2 flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
          <TechnicianDashboardDetailPanel caseId={selectedCaseId} />
        </section>
      }
      right={
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
          <TechnicianDashboardImagesPanel caseId={selectedCaseId} />
        </div>
      }
    />
  );
}
