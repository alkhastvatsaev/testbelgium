import type { DashboardPagerApi } from "@/features/dashboard/dashboardPagerContext";
import { TECHNICIAN_HUB_SLOT_INDEX } from "@/features/interventions/technicianDashboardConstants";

/** Ancres pour défiler dans le hub technicien (une seule page carrousel). */
export const TECHNICIAN_HUB_ANCHOR_OFFLINE = "technician-hub-offline";
export const TECHNICIAN_HUB_ANCHOR_MISSIONS = "technician-hub-missions";
export const TECHNICIAN_HUB_ANCHOR_FINISH = "technician-hub-finish";
export const TECHNICIAN_HUB_ANCHOR_PUSH = "technician-hub-push";
export const TECHNICIAN_HUB_ANCHOR_INVOICE = "technician-hub-invoice";

/**
 * Affiche la page hub technicien ; fait défiler vers une section si `anchor` est fourni.
 */
export function navigateTechnicianHub(pager: DashboardPagerApi | null | undefined, anchor?: string): void {
  if (!pager) return;
  const wasOnHub = pager.pageIndex === TECHNICIAN_HUB_SLOT_INDEX;
  pager.setPageIndex(TECHNICIAN_HUB_SLOT_INDEX);
  if (!anchor || typeof document === "undefined") return;
  const run = () => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (wasOnHub) {
    requestAnimationFrame(() => requestAnimationFrame(run));
  } else {
    window.setTimeout(run, 520);
  }
}
