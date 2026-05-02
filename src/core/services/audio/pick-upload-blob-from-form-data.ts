/**
 * MacroDroid (et d’autres clients) envoient souvent plusieurs parties multipart :
 * métadonnées, vignette, ou un premier champ fichier vide / minimal. Prendre
 * le **premier** Blob non vide récupère parfois ~10–20 ko sans mdat audio.
 * On choisit le Blob / File le plus volumineux (données audio réelles).
 */
export function pickLargestUploadBlobFromFormData(formData: FormData): Blob | null {
  let best: Blob | null = null;
  let bestSize = 0;

  for (const [, value] of formData.entries()) {
    if (typeof value !== 'object' || value === null || !('size' in value)) continue;
    const blob = value as Blob;
    if (blob.size > bestSize) {
      bestSize = blob.size;
      best = blob;
    }
  }

  return bestSize > 0 ? best : null;
}
