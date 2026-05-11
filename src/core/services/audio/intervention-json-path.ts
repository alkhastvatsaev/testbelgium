import fs from "fs";
import path from "path";

/** Chemin relatif sous `public/uploads` (ex. `M_DUPONT/call.m4a`) sans `..` ni segments vides. */
export function isSafeUploadsRelativePath(rel: string): boolean {
  const parts = rel.trim().replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.length > 0 && !parts.some((p) => p === ".." || p === ".");
}

/**
 * Fichier brouillon `*.intervention.json` au même endroit que l’audio (y compris sous-dossiers clients).
 */
export function interventionJsonAbsPath(uploadsRoot: string, uploadAudioRelative: string): string {
  const rel = uploadAudioRelative.trim().replace(/\\/g, "/");
  if (!isSafeUploadsRelativePath(rel)) {
    throw new Error("[intervention-json-path] Chemin uploads invalide");
  }
  const segments = rel.split("/").filter(Boolean);
  const baseFile = segments.pop()!;
  const stem = path.basename(baseFile, path.extname(baseFile));
  const interventionName = `${stem}.intervention.json`;
  if (segments.length === 0) return path.join(uploadsRoot, interventionName);
  return path.join(uploadsRoot, ...segments, interventionName);
}

/** URL publique pour un fichier déjà résolu sous `uploadsRoot`. */
export function publicUrlUnderUploads(uploadsRoot: string, absolutePath: string): string {
  const rel = path.relative(uploadsRoot, absolutePath).replace(/\\/g, "/");
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("[intervention-json-path] Fichier hors uploads");
  }
  return `/uploads/${rel}`;
}

export function writeInterventionDraftToDisk(uploadsRoot: string, uploadAudioRelative: string, payload: unknown): string {
  const out = interventionJsonAbsPath(uploadsRoot, uploadAudioRelative);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return publicUrlUnderUploads(uploadsRoot, out);
}
