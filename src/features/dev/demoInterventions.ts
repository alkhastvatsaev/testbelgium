import type { Intervention } from "@/features/interventions/types";
import { DEMO_COMPANY_ID } from "@/core/config/devUiPreview";

const now = new Date();

/**
 * Données démo back-office uniquement (sans `assignedTechnicianUid`).
 * Les missions assignées au technicien démo viennent de `generateDailyMissions` → `generateDailyAssignmentsAsInterventions`.
 */
export const DEMO_INTERVENTIONS: Intervention[] = [
  {
    id: "demo-mission-backoffice-only",
    title: "Demande standard — sans assignation",
    address: "Place Flagey 18, 1050 Ixelles",
    time: "16:00",
    status: "pending_needs_address",
    location: { lat: 50.8277, lng: 4.372 },
    clientName: "PME Flagey SPRL",
    category: "serrurerie",
    problem: "Besoin de passage cette semaine pour audit serrures.",
    companyId: DEMO_COMPANY_ID,
    createdAt: new Date(now.getTime() - 7200000).toISOString(),
  },
];

export function demoInterventionsForCompany(companyId: string): Intervention[] {
  const cid = companyId.trim();
  if (!cid) return [];
  return DEMO_INTERVENTIONS.filter((iv) => (iv.companyId ?? "").trim() === cid);
}
