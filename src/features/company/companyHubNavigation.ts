import type { DashboardPagerApi } from "@/features/dashboard/dashboardPagerContext";
import { COMPANY_HUB_PAGE_INDEX } from "@/features/company/companyHubConstants";

/** Ancres pour défiler dans le hub société (une page carrousel). */
export const COMPANY_HUB_ANCHOR_SMART_FORM = "company-hub-smart-form";
export const COMPANY_HUB_ANCHOR_WORKSPACE = "company-hub-workspace";
export const COMPANY_HUB_ANCHOR_CLIENT_PORTAL = "company-hub-client-portal";

export function navigateCompanyHub(pager: DashboardPagerApi | null | undefined, anchor?: string): void {
  if (!pager) return;
  const wasOnHub = pager.pageIndex === COMPANY_HUB_PAGE_INDEX;
  pager.setPageIndex(COMPANY_HUB_PAGE_INDEX);
  if (!anchor || typeof document === "undefined") return;
  const run = () => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (wasOnHub) {
    requestAnimationFrame(() => requestAnimationFrame(run));
  } else {
    window.setTimeout(run, 520);
  }
}
