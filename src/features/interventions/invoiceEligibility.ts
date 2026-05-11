import type { Intervention } from "@/features/interventions/types";

/** Checklist facture : au moins une photo chantier + signature (URLs Storage). */
export function isInvoiceChecklistComplete(iv: Partial<Intervention> | null | undefined): boolean {
  const photos = Array.isArray(iv?.completionPhotoUrls) ? iv!.completionPhotoUrls! : [];
  const sig = iv?.completionSignatureUrl;
  const hasPhotos = photos.length > 0;
  const hasSig = typeof sig === "string" && sig.trim().length > 0;
  return hasPhotos && hasSig;
}

export function isAwaitingAutoInvoice(iv: Partial<Intervention> | null | undefined): boolean {
  return iv?.status === "done" && isInvoiceChecklistComplete(iv) && !iv?.invoicePdfUrl;
}

export function hasDownloadableInvoice(iv: Partial<Intervention> | null | undefined): boolean {
  return iv?.status === "invoiced" && typeof iv?.invoicePdfUrl === "string" && iv.invoicePdfUrl.length > 0;
}
