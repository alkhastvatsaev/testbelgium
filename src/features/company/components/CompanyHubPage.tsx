"use client";

import DashboardTriplePanelLayout from "@/features/dashboard/components/DashboardTriplePanelLayout";
import RequesterProfilePanel from "@/features/interventions/components/RequesterProfilePanel";
import RequesterInterventionPanel from "@/features/interventions/components/RequesterInterventionPanel";
import RequesterTrackingPanel from "@/features/interventions/components/RequesterTrackingPanel";
import { RequesterHubProvider } from "@/features/interventions/context/RequesterHubContext";
import {
  COMPANY_HUB_ANCHOR_CLIENT_PORTAL,
  COMPANY_HUB_ANCHOR_SMART_FORM,
  COMPANY_HUB_ANCHOR_WORKSPACE,
} from "@/features/company/companyHubNavigation";

const railGap = "flex min-h-0 flex-1 flex-col gap-6 pb-4";

/** Interface Demandeur (Page 2) — Qui demande, Que faut-il réparer, Où en est ma demande. */
export default function CompanyHubPage() {
  return (
    <RequesterHubProvider>
      <DashboardTriplePanelLayout
        rootTestId="dashboard-secondary-placeholder"
        leftTestId="dashboard-secondary-panel-left"
        centerTestId="dashboard-secondary-panel-center"
        rightTestId="dashboard-secondary-panel-right"
        leftAriaLabel="Qui demande ? — hub demandeur"
        centerAriaLabel="Que faut-il réparer ? — hub demandeur"
        rightAriaLabel="Où en est ma demande ? — hub demandeur"
        left={
          <section
            id={COMPANY_HUB_ANCHOR_WORKSPACE}
            data-testid="company-hub-rail-demande"
            className={`${railGap} scroll-mt-2`}
          >
            <RequesterProfilePanel />
          </section>
        }
        center={
          <section id={COMPANY_HUB_ANCHOR_SMART_FORM} className={`${railGap} scroll-mt-2`}>
            <RequesterInterventionPanel />
          </section>
        }
        right={
          <section id={COMPANY_HUB_ANCHOR_CLIENT_PORTAL} className={`${railGap} scroll-mt-2`}>
            <RequesterTrackingPanel />
          </section>
        }
        centerPadding={false}
        rightPadding={false}
      />
    </RequesterHubProvider>
  );
}
