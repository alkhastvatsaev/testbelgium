"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardTriplePanelLayout from "@/features/dashboard/components/DashboardTriplePanelLayout";
import TechnicianDashboardListPanel from "@/features/interventions/components/TechnicianDashboardListPanel";
import TechnicianDashboardDetailPanel from "@/features/interventions/components/TechnicianDashboardDetailPanel";
import TechnicianDashboardImagesPanel from "@/features/interventions/components/TechnicianDashboardImagesPanel";
import TechnicianFinishJobPanel from "@/features/interventions/components/TechnicianFinishJobPanel";
import { useTechnicianCaseIntent } from "@/context/TechnicianCaseIntentContext";
import { useTechnicianFinishJob } from "@/context/TechnicianFinishJobContext";
import { useTranslation } from "@/core/i18n/I18nContext";
import {
  TECHNICIAN_HUB_ANCHOR_MISSIONS,
  TECHNICIAN_HUB_ANCHOR_FINISH,
} from "@/features/interventions/technicianHubNavigation";
import { useTechnicianAssignments } from "@/features/interventions/useTechnicianAssignments";
import { useTechnicianMissionDayAnchor } from "@/features/interventions/useTechnicianMissionDayAnchor";
import {
  interventionVisibleInTechnicianMissionList,
  sortInterventionsByScheduleAsc,
} from "@/features/interventions/technicianSchedule";
import { isTechnicianAssignmentAwaitingResponse } from "@/features/interventions/technicianAssignmentActions";
import { AnimatePresence, motion } from "framer-motion";

type Props = { slotIndex: number };

/**
 * Une page carrousel = tout le poste **technicien** : Ma Journée (gauche), missions (centre),
 * photos client (droite).
 */
export default function TechnicianHubPage({ slotIndex }: Props) {
  const humanPage = slotIndex + 1;
  const { t } = useTranslation();
  const { pendingCaseId, setPendingCaseId } = useTechnicianCaseIntent();
  const { finishJobInterventionId } = useTechnicianFinishJob();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { interventions, firebaseUid } = useTechnicianAssignments();
  const missionDayAnchor = useTechnicianMissionDayAnchor();

  /** Même filtre « aujourd’hui » que la liste gauche (sélection auto du 1er dossier du jour). */
  const filteredSorted = useMemo(() => {
    const todayRows = interventions.filter((iv) =>
      interventionVisibleInTechnicianMissionList(iv, "today", firebaseUid, missionDayAnchor),
    );
    const awaiting = todayRows.filter((iv) =>
      isTechnicianAssignmentAwaitingResponse(iv, firebaseUid),
    );
    const rest = todayRows.filter(
      (iv) => !isTechnicianAssignmentAwaitingResponse(iv, firebaseUid),
    );
    return [
      ...sortInterventionsByScheduleAsc(awaiting),
      ...sortInterventionsByScheduleAsc(rest),
    ];
  }, [interventions, missionDayAnchor, firebaseUid]);

  /** Ne pas auto-sélectionner une mission déjà en archives (évite détail « clôturée » + photos sans clic explicite). */
  const activeTodaySorted = useMemo(
    () =>
      filteredSorted.filter((iv) => iv.status !== "done" && iv.status !== "invoiced"),
    [filteredSorted],
  );

  useEffect(() => {
    if (pendingCaseId) {
      setSelectedCaseId(pendingCaseId);
      setPendingCaseId(null);
      return;
    }
    setSelectedCaseId((prev) => {
      if (prev) {
        const iv = interventions.find((x) => x.id === prev);
        if (!iv) return activeTodaySorted[0]?.id ?? null;
        if (
          !interventionVisibleInTechnicianMissionList(iv, "today", firebaseUid, missionDayAnchor)
        ) {
          return activeTodaySorted[0]?.id ?? null;
        }
        return prev;
      }
      return activeTodaySorted[0]?.id ?? null;
    });
  }, [pendingCaseId, setPendingCaseId, interventions, missionDayAnchor, activeTodaySorted, firebaseUid]);

  return (
    <DashboardTriplePanelLayout
      rootTestId={`dashboard-pager-slot-${slotIndex}`}
      leftTestId={`dashboard-pager-slot-${slotIndex}-panel-left`}
      centerTestId={`dashboard-pager-slot-${slotIndex}-panel-center`}
      rightTestId={`dashboard-pager-slot-${slotIndex}-panel-right`}
      leftAriaLabel={`${t("technician_hub.aria.page")} ${humanPage} — ${t("technician_hub.aria.left")}`}
      centerAriaLabel={`${t("technician_hub.aria.page")} ${humanPage} — ${t("technician_hub.aria.center")}`}
      rightAriaLabel={`${t("technician_hub.aria.page")} ${humanPage} — ${t("technician_hub.aria.right")}`}
      left={
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
          <TechnicianDashboardListPanel selectedCaseId={selectedCaseId} onSelect={setSelectedCaseId} />
        </div>
      }
      centerPadding={false}
      center={
        <section
          id={TECHNICIAN_HUB_ANCHOR_MISSIONS}
          className="relative scroll-mt-2 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TechnicianDashboardDetailPanel caseId={selectedCaseId} />
          <AnimatePresence>
            {finishJobInterventionId ? (
              <motion.div
                key={finishJobInterventionId}
                data-testid="technician-finish-job-layer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden rounded-[18px] bg-white shadow-[inset_0_1px_0_rgba(0,0,0,0.05)]"
              >
                <TechnicianFinishJobPanel />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      }
      right={
        <div id={TECHNICIAN_HUB_ANCHOR_FINISH} className="scroll-mt-2 flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
          <TechnicianDashboardImagesPanel caseId={selectedCaseId} />
        </div>
      }
    />
  );
}
