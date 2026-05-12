import type { BridgedTechnicianReport } from "@/context/TechnicianBackofficeReportBridgeContext";
import type { Intervention } from "@/features/interventions/types";

export function pickLatestBridgedReportForIntervention(
  reports: BridgedTechnicianReport[],
  interventionId: string,
): BridgedTechnicianReport | null {
  const matches = reports.filter((r) => r.interventionId === interventionId);
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (a.receivedAt >= b.receivedAt ? a : b));
}

/** Préfère les URLs Storage Firestore ; sinon repli sur le pont technicien (même onglet / mode démo). */
export function mergeReportCompletionMedia(
  intervention: Pick<Intervention, "completionPhotoUrls" | "completionSignatureUrl">,
  bridged: BridgedTechnicianReport | null,
): { photoUrls: string[]; signatureUrl: string | null } {
  const fromFs = Array.isArray(intervention.completionPhotoUrls)
    ? intervention.completionPhotoUrls.filter((u) => typeof u === "string" && u.trim() !== "")
    : [];
  const fsSig =
    typeof intervention.completionSignatureUrl === "string" &&
    intervention.completionSignatureUrl.trim() !== ""
      ? intervention.completionSignatureUrl
      : null;

  const fromBridgePhotos = (bridged?.photoDataUrls ?? []).filter(
    (u) => typeof u === "string" && u.trim() !== "",
  );
  const fromBridgeSig =
    typeof bridged?.signaturePngDataUrl === "string" && bridged.signaturePngDataUrl.trim() !== ""
      ? bridged.signaturePngDataUrl
      : null;

  return {
    photoUrls: fromFs.length > 0 ? fromFs : fromBridgePhotos,
    signatureUrl: fsSig ?? fromBridgeSig,
  };
}

/** Retire le pont local seulement quand le serveur a les médias ou le dossier est déjà facturé / archivé. */
export function shouldDismissBridgedTerrainReport(
  intervention: Pick<Intervention, "status" | "completionPhotoUrls" | "completionSignatureUrl"> | undefined,
): boolean {
  if (!intervention) return false;
  if (intervention.status === "invoiced") return true;
  if (intervention.status !== "done") return false;
  const photos = Array.isArray(intervention.completionPhotoUrls)
    ? intervention.completionPhotoUrls.filter((u) => typeof u === "string" && u.trim() !== "")
    : [];
  const hasSig =
    typeof intervention.completionSignatureUrl === "string" &&
    intervention.completionSignatureUrl.trim() !== "";
  return photos.length > 0 && hasSig;
}
