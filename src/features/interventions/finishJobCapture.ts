/** Capture vidéo → JPEG data URL (compression légère pour upload rapide). */
export function capturePhotoFromVideo(video: HTMLVideoElement, quality = 0.82): string {
  const w0 = video.videoWidth;
  const h0 = video.videoHeight;
  if (!w0 || !h0) {
    throw new Error("Vidéo pas encore prête");
  }

  const canvas = document.createElement("canvas");
  canvas.width = w0;
  canvas.height = h0;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(video, 0, 0);

  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(w0, h0));
  if (scale >= 1) {
    return canvas.toDataURL("image/jpeg", quality);
  }

  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas indisponible");
  octx.drawImage(canvas, 0, 0, w, h);
  return out.toDataURL("image/jpeg", quality);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const i = dataUrl.indexOf(",");
  if (i === -1) throw new Error("Data URL invalide");
  const header = dataUrl.slice(0, i);
  const b64 = dataUrl.slice(i + 1);
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
  return new Blob([bytes], { type: mime });
}
