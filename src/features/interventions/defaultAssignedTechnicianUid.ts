import { DEMO_TECHNICIAN_UID } from "@/core/config/devUiPreview";

/**
 * UID enregistré sur l’intervention quand on assigne « Mansour » depuis le back-office.
 * - **Local / dev** : repli sur `DEMO_TECHNICIAN_UID` (démo + auth anonyme).
 * - **Vercel / prod** : définir `NEXT_PUBLIC_DEFAULT_ASSIGNED_TECHNICIAN_UID` = UID Firebase Auth
 *   du technicien (Console → Authentication → utilisateur Mansour) — **pas** `demo-tech-local`.
 */
export function getDefaultAssignedTechnicianUid(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_ASSIGNED_TECHNICIAN_UID?.trim();
  if (fromEnv) return fromEnv;
  return DEMO_TECHNICIAN_UID;
}
