"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardTriplePanelLayout from "@/features/dashboard/components/DashboardTriplePanelLayout";
import TechnicianDashboardListPanel from "@/features/interventions/components/TechnicianDashboardListPanel";
import TechnicianDashboardDetailPanel from "@/features/interventions/components/TechnicianDashboardDetailPanel";
import TechnicianDashboardImagesPanel from "@/features/interventions/components/TechnicianDashboardImagesPanel";
import TechnicianFinishJobPanel from "@/features/interventions/components/TechnicianFinishJobPanel";
import { useTechnicianCaseIntent } from "@/context/TechnicianCaseIntentContext";
import { useTechnicianFinishJob } from "@/context/TechnicianFinishJobContext";
import {
  TECHNICIAN_HUB_ANCHOR_MISSIONS,
  TECHNICIAN_HUB_ANCHOR_FINISH,
} from "@/features/interventions/technicianHubNavigation";
import { useTechnicianAssignments } from "@/features/interventions/useTechnicianAssignments";
import { interventionMatchesTab, sortInterventionsByScheduleAsc } from "@/features/interventions/technicianSchedule";
import { useDashboardSelectedDate } from "@/context/DateContext";
import { auth } from "@/core/config/firebase";
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";
import { AnimatePresence, motion } from "framer-motion";

type Props = { slotIndex: number };

/**
 * Une page carrousel = tout le poste **technicien** : Ma Journée (gauche), missions (centre),
 * photos client (droite).
 */
export default function TechnicianHubPage({ slotIndex }: Props) {
  const humanPage = slotIndex + 1;
  const { pendingCaseId, setPendingCaseId } = useTechnicianCaseIntent();
  const { finishJobInterventionId } = useTechnicianFinishJob();
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
    <>
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
          <div id={TECHNICIAN_HUB_ANCHOR_FINISH} className="scroll-mt-2 flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
            <TechnicianDashboardImagesPanel caseId={selectedCaseId} />
          </div>
        }
      />
      
      {/* Full screen overlay for Finish Job */}
      <AnimatePresence>
        {finishJobInterventionId && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12"
          >
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            
            {/* Modal Container */}
            <div className="relative flex max-h-full w-full max-w-[500px] flex-col overflow-hidden rounded-[32px] bg-white/80 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] backdrop-blur-xl border border-white/40">
              <TechnicianFinishJobPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
