"use client";

import DashboardTriplePanelLayout from "@/features/dashboard/components/DashboardTriplePanelLayout";
import TechnicianDayPanel from "@/features/interventions/components/TechnicianDayPanel";
import TechnicianDashboardPanel from "@/features/interventions/components/TechnicianDashboardPanel";
import TechnicianFinishJobPanel from "@/features/interventions/components/TechnicianFinishJobPanel";
import TechnicianInvoiceAutomationPanel from "@/features/interventions/components/TechnicianInvoiceAutomationPanel";
import TechnicianOfflineSyncPanel from "@/features/offline/components/TechnicianOfflineSyncPanel";
import {
  TECHNICIAN_HUB_ANCHOR_FINISH,
  TECHNICIAN_HUB_ANCHOR_INVOICE,
  TECHNICIAN_HUB_ANCHOR_MISSIONS,
} from "@/features/interventions/technicianHubNavigation";

type Props = { slotIndex: number };

const railGap = "flex flex-col gap-6 pb-4";

/**
 * Une page carrousel = tout le poste **technicien** : Ma Journée (gauche), missions (centre),
 * clôture + facturation auto (droite).
 */
export default function TechnicianHubPage({ slotIndex }: Props) {
  const humanPage = slotIndex + 1;

  return (
    <DashboardTriplePanelLayout
      rootTestId={`dashboard-pager-slot-${slotIndex}`}
      leftTestId={`dashboard-pager-slot-${slotIndex}-panel-left`}
      centerTestId={`dashboard-pager-slot-${slotIndex}-panel-center`}
      rightTestId={`dashboard-pager-slot-${slotIndex}-panel-right`}
      leftAriaLabel={`Page ${humanPage} — technicien : ma journée`}
      centerAriaLabel={`Page ${humanPage} — technicien : missions`}
      rightAriaLabel={`Page ${humanPage} — technicien : clôture`}
      left={<TechnicianDayPanel />}
      center={
        <section id={TECHNICIAN_HUB_ANCHOR_MISSIONS} className="scroll-mt-2">
          <TechnicianDashboardPanel />
        </section>
      }
      right={
        <div className={railGap}>
          <section id={TECHNICIAN_HUB_ANCHOR_FINISH} className="scroll-mt-2 flex min-h-0 flex-1 flex-col">
            <TechnicianFinishJobPanel />
          </section>
          <section id={TECHNICIAN_HUB_ANCHOR_INVOICE} className="scroll-mt-2 shrink-0">
            <TechnicianInvoiceAutomationPanel />
          </section>
          <section className="shrink-0">
            <TechnicianOfflineSyncPanel />
          </section>
        </div>
      }
    />
  );
}
