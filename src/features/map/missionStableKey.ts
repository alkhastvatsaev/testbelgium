import type { Mission } from "@/utils/mockMissions";

/** Clé stable pour dédoublonner / archiver une mission carte (Firestore id, fichier local, etc.). */
export function missionStableKey(mission: Pick<Mission, "id" | "key">): string {
  return mission.key ?? String(mission.id);
}
