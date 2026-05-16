/**
 * Prévisualisation UI sans Firebase ni tenant réel (développement uniquement).
 *
 * Activé si `NODE_ENV === "development"` SAUF si vous définissez
 * `NEXT_PUBLIC_DISABLE_DEV_UI_PREVIEW=true`.
 *
 * Production : toujours désactivé.
 */
export const devUiPreviewEnabled =
  (process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_FORCE_DEV_UI_PREVIEW === "true") &&
  process.env.NEXT_PUBLIC_DISABLE_DEV_UI_PREVIEW !== "true";

const inDevOrPreview = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_FORCE_DEV_UI_PREVIEW === "true";

/**
 * Masque missions / grilles générées (carte, technicien démo, etc.) et fichiers locaux `.intervention.json`.
 *
 * - **Développement / Preview** : Les démos sont visibles par défaut. Pour les cacher : `NEXT_PUBLIC_HIDE_DEMO_MISSIONS=true`.
 * - **Production / test** : `false` sauf si `NEXT_PUBLIC_REAL_INTERVENTIONS_ONLY=true`.
 *
 * Les dossiers Firestore aux ids seed (`1`, `2`, `3`, `mock-day-*`, …) sont **toujours** filtrés à l’affichage
 * via `stripKnownSyntheticInterventions` — ils peuvent rester dans la base tant qu’ils ne sont pas supprimés manuellement.
 */
export const realInterventionsOnly =
  process.env.NEXT_PUBLIC_REAL_INTERVENTIONS_ONLY === "true" ||
  (inDevOrPreview && process.env.NEXT_PUBLIC_HIDE_DEMO_MISSIONS === "true");

const LEGACY_SEED_INTERVENTION_IDS = new Set(["1", "2", "3", "demo-mission-backoffice-only"]);

export function isSyntheticInterventionId(id: string): boolean {
  if (!id) return false;
  if (LEGACY_SEED_INTERVENTION_IDS.has(id)) return true;
  return id.startsWith("mock-day-");
}

/** Retire les dossiers seed / mock connus (toute source, surtout Firestore). */
export function stripKnownSyntheticInterventions<T extends { id: string }>(rows: T[]): T[] {
  return rows.filter((r) => !isSyntheticInterventionId(r.id));
}

/** @deprecated alias de {@link stripKnownSyntheticInterventions} */
export function excludeSyntheticInterventions<T extends { id: string }>(rows: T[]): T[] {
  return stripKnownSyntheticInterventions(rows);
}

export const DEMO_COMPANY_ID = "demo-local-company";

/** UID fictif : sessions anonymes dev utilisent ces dossiers comme missions « MANSOUR » (voir UserProfile). */
export const DEMO_TECHNICIAN_UID = "demo-tech-local";
