/**
 * Prévisualisation UI sans Firebase ni tenant réel (développement uniquement).
 *
 * Activé si `NODE_ENV === "development"` SAUF si vous définissez
 * `NEXT_PUBLIC_DISABLE_DEV_UI_PREVIEW=true`.
 *
 * Production : toujours désactivé.
 */
export const devUiPreviewEnabled =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DISABLE_DEV_UI_PREVIEW !== "true";

export const DEMO_COMPANY_ID = "demo-local-company";

/** UID fictif : sessions anonymes dev utilisent ces dossiers comme missions « MANSOUR » (voir UserProfile). */
export const DEMO_TECHNICIAN_UID = "demo-tech-local";
