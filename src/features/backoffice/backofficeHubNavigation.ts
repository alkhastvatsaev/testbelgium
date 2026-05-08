import type { DashboardPagerApi } from "@/features/dashboard/dashboardPagerContext";
import { BACKOFFICE_HUB_PAGE_INDEX } from "@/features/backoffice/backofficeConstants";

export const BACKOFFICE_HUB_ANCHOR_DUPLICATES = "backoffice-hub-duplicates";
export const BACKOFFICE_HUB_ANCHOR_DASHBOARD = "backoffice-hub-dashboard";
export const BACKOFFICE_HUB_ANCHOR_CALENDAR = "backoffice-hub-calendar";

export function navigateBackOfficeHub(pager: DashboardPagerApi | null | undefined, anchor?: string): void {
  if (!pager) return;
  const wasOnHub = pager.pageIndex === BACKOFFICE_HUB_PAGE_INDEX;
  pager.setPageIndex(BACKOFFICE_HUB_PAGE_INDEX);
  if (!anchor || typeof document === "undefined") return;
  const run = () => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (wasOnHub) {
    requestAnimationFrame(() => requestAnimationFrame(run));
  } else {
    window.setTimeout(run, 520);
  }
}
