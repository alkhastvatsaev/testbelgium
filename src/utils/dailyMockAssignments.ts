import type { Intervention } from "@/features/interventions/types";
import { DEMO_COMPANY_ID, DEMO_TECHNICIAN_UID } from "@/core/config/devUiPreview";
import { generateDailyMissions } from "@/utils/mockMissions";

function missionUiStatusToInterventionStatus(ui: string): Intervention["status"] {
  if (ui === "Terminé") return "done";
  if (ui === "En cours") return "in_progress";
  return "pending";
}

/**
 * Transforme les « missions du jour » mock (`generateDailyMissions`) en dossiers Firestore-shaped,
 * tous assignés au technicien démo (`DEMO_TECHNICIAN_UID`).
 * Même entrée que la grille carte / DailyMissions pour une date donnée (`DateContext.selectedDate`).
 */
export function generateDailyAssignmentsAsInterventions(date: Date): Intervention[] {
  const missions = generateDailyMissions(date);
  const dateStr = date.toLocaleDateString("en-CA");
  const isoStamp = new Date().toISOString();

  return missions.map((m, idx) => {
    const [lng, lat] = m.coordinates;
    const id = `mock-day-${dateStr}-${idx}`;
    return {
      id,
      title: `Passage — ${m.clientName}`,
      address: `≈ ${lat.toFixed(4)}°, ${lng.toFixed(4)}° · Bruxelles`,
      time: m.time,
      status: missionUiStatusToInterventionStatus(m.status),
      location: { lat, lng },
      clientName: m.clientName,
      category: "serrurerie",
      problem: `Mission générée (${dateStr} · même jeu que la page carte).`,
      companyId: DEMO_COMPANY_ID,
      assignedTechnicianUid: DEMO_TECHNICIAN_UID,
      scheduledDate: dateStr,
      scheduledTime: m.time,
      createdAt: isoStamp,
    };
  });
}
