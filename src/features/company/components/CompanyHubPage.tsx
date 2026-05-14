"use client";

import { useMemo, useState } from "react";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import DashboardTriplePanelLayout from "@/features/dashboard/components/DashboardTriplePanelLayout";
import IvanaClientChatPanel from "@/features/backoffice/components/IvanaClientChatPanel";
import RequesterProfilePanel from "@/features/interventions/components/RequesterProfilePanel";
import RequesterInterventionPanel from "@/features/interventions/components/RequesterInterventionPanel";
import RequesterTrackingPanel from "@/features/interventions/components/RequesterTrackingPanel";
import {
  COMPANY_HUB_ANCHOR_CLIENT_PORTAL,
  COMPANY_HUB_ANCHOR_SMART_FORM,
  COMPANY_HUB_ANCHOR_WORKSPACE,
} from "@/features/company/companyHubNavigation";
import { DASHBOARD_DESKTOP_PANEL_GAP_CLASS } from "@/core/ui/dashboardDesktopLayout";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/core/i18n/I18nContext";

/** Même pas que la grille desktop (`DASHBOARD_DESKTOP_PANEL_GAP_CLASS`) — rythme équidistant. */
const railGap = `flex min-h-0 flex-1 flex-col ${DASHBOARD_DESKTOP_PANEL_GAP_CLASS} pb-4`;

type CompanyHubRightCategory = "tracking" | "chat";

/** Interface Demandeur (Page 2) — Qui demande, Que faut-il réparer, Où en est ma demande. */
export default function CompanyHubPage() {
  const [rightCategory, setRightCategory] = useState<CompanyHubRightCategory>("tracking");
  const workspace = useCompanyWorkspaceOptional();
  const { t } = useTranslation();

  const ivanaChatCompanyId = useMemo(() => {
    if (workspace?.isTenantUser && workspace.activeCompanyId) return workspace.activeCompanyId;
    const env =
      typeof process.env.NEXT_PUBLIC_CLIENT_PORTAL_DEFAULT_COMPANY_ID === "string"
        ? process.env.NEXT_PUBLIC_CLIENT_PORTAL_DEFAULT_COMPANY_ID.trim()
        : "";
    return env || null;
  }, [workspace?.isTenantUser, workspace?.activeCompanyId]);

  return (
    <DashboardTriplePanelLayout
      rootTestId="dashboard-secondary-placeholder"
      leftTestId="dashboard-secondary-panel-left"
      centerTestId="dashboard-secondary-panel-center"
      rightTestId="dashboard-secondary-panel-right"
      leftAriaLabel={t("company_hub.aria.left")}
      centerAriaLabel={t("company_hub.aria.center")}
      rightAriaLabel={t("company_hub.aria.right")}
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
        <section
          id={COMPANY_HUB_ANCHOR_CLIENT_PORTAL}
          data-testid="company-hub-rail-portail"
          className="flex min-h-0 flex-1 flex-col overflow-hidden scroll-mt-2"
        >
          <div
            role="tablist"
            aria-label={t("company_hub.right_tabs.aria")}
            className="mx-4 mt-4 flex shrink-0 gap-1 rounded-[20px] border border-slate-300/30 bg-slate-200/50 p-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={rightCategory === "tracking"}
              data-testid="company-hub-right-tab-tracking"
              onClick={() => setRightCategory("tracking")}
              className={cn(
                "flex min-h-[44px] flex-1 items-center justify-center rounded-[16px] px-2 py-2 text-center text-[11px] font-bold transition-all sm:text-[12px]",
                rightCategory === "tracking"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:bg-slate-300/30",
              )}
            >
              {t("company_hub.right_tabs.tracking")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rightCategory === "chat"}
              data-testid="company-hub-right-tab-chat"
              onClick={() => setRightCategory("chat")}
              className={cn(
                "flex min-h-[44px] flex-1 items-center justify-center rounded-[16px] px-2 py-2 text-center text-[11px] font-bold transition-all sm:text-[12px]",
                rightCategory === "chat"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:bg-slate-300/30",
              )}
            >
              {t("company_hub.right_tabs.chat")}
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden" role="tabpanel">
            {rightCategory === "tracking" ? (
              <RequesterTrackingPanel />
            ) : (
              <IvanaClientChatPanel
                className="min-h-0 flex-1"
                publishAsPortal
                chatCompanyId={ivanaChatCompanyId}
              />
            )}
          </div>
        </section>
      }
      centerPadding={false}
      rightPadding={false}
    />
  );
}
