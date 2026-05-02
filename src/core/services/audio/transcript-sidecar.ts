import fs from "fs";
import path from "path";
import type { AudioUploadSidecar } from "./transcription.types";
import { isSafeUploadsRelativePath } from "./intervention-json-path";
import { findUploadedAudioRelativePath } from "./resolve-upload-by-basename";

function normalizeUploadRelativePath(uploadPathOrPublicUrl: string): string | null {
  let relative = uploadPathOrPublicUrl;
  if (uploadPathOrPublicUrl.startsWith("/uploads/")) {
    relative = uploadPathOrPublicUrl.replace(/^\/uploads\//, "");
  } else if (uploadPathOrPublicUrl.includes(`${path.sep}public${path.sep}uploads${path.sep}`)) {
    relative = uploadPathOrPublicUrl.split(`${path.sep}uploads${path.sep}`).pop() ?? "";
  }

  relative = relative.replace(/\\/g, "/").trim();
  if (!relative || !isSafeUploadsRelativePath(relative)) {
    console.warn("[transcript-sidecar] Refusing unsafe path:", uploadPathOrPublicUrl);
    return null;
  }
  return relative;
}

function readAudioJsonAtRelative(rel: string): AudioUploadSidecar | null {
  const jsonPath = audioJsonSidecarPathForPublicUpload(rel);
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as AudioUploadSidecar;
    if (data?.schemaVersion !== 1 || !data.analysis) return null;
    return data;
  } catch {
    return null;
  }
}

/** Résout `fichier.m4a` vers `M_CLIENT/fichier.m4a` si besoin (après rangement en sous-dossiers). */
function resolveUploadsRelativeForSidecarRead(uploadsFileName: string): string {
  const rel = uploadsFileName.trim().replace(/\\/g, "/");
  if (!rel || !isSafeUploadsRelativePath(rel)) return rel;

  if (readAudioJsonAtRelative(rel)) return rel;

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const audioAbs = path.join(uploadsRoot, ...rel.split("/").filter(Boolean));
  try {
    if (fs.existsSync(audioAbs) && fs.statSync(audioAbs).isFile()) return rel;
  } catch {
    /* ignore */
  }

  if (!rel.includes("/")) {
    const found = findUploadedAudioRelativePath(uploadsRoot, rel);
    if (found) return found;
  }
  return rel;
}

/** `foo.m4a` → `foo.transcript.txt` (ancien format, lecture seule) */
export function transcriptSidecarPathForPublicUpload(uploadsRelativeFileName: string): string {
  const rel = uploadsRelativeFileName.replace(/\\/g, "/");
  if (!isSafeUploadsRelativePath(rel)) {
    throw new Error("[transcript-sidecar] Chemin relatif uploads refuse pour sidecar");
  }
  const dir = path.dirname(rel);
  const base = path.basename(rel, path.extname(rel));
  return path.join(process.cwd(), "public", "uploads", dir, `${base}.transcript.txt`);
}

/** `foo.m4a` → `foo.audio.json` (métadonnées + analyse complète) */
export function audioJsonSidecarPathForPublicUpload(uploadsRelativeFileName: string): string {
  const rel = uploadsRelativeFileName.replace(/\\/g, "/");
  if (!isSafeUploadsRelativePath(rel)) {
    throw new Error("[transcript-sidecar] Chemin relatif uploads refuse pour sidecar");
  }
  const dir = path.dirname(rel);
  const base = path.basename(rel, path.extname(rel));
  return path.join(process.cwd(), "public", "uploads", dir, `${base}.audio.json`);
}

export function writeAudioUploadSidecar(uploadPathOrPublicUrl: string, payload: AudioUploadSidecar): void {
  const relative = normalizeUploadRelativePath(uploadPathOrPublicUrl);
  if (!relative) return;
  const out = audioJsonSidecarPathForPublicUpload(relative);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function readAudioUploadSidecarIfPresent(uploadsFileName: string): AudioUploadSidecar | null {
  const resolved = resolveUploadsRelativeForSidecarRead(uploadsFileName);
  if (!isSafeUploadsRelativePath(resolved)) return null;
  return readAudioJsonAtRelative(resolved);
}

/** Texte affiché sur la carte : JSON `.audio.json` si présent, sinon `.transcript.txt` legacy */
export function readTranscriptSidecarIfPresent(uploadsFileName: string): string | null {
  const resolved = resolveUploadsRelativeForSidecarRead(uploadsFileName);
  if (!isSafeUploadsRelativePath(resolved)) return null;
  const sidecar = readAudioJsonAtRelative(resolved);
  const fromJson = sidecar?.analysis?.transcription?.trim();
  if (fromJson) return fromJson;

  const txtPath = transcriptSidecarPathForPublicUpload(resolved);
  if (!fs.existsSync(txtPath)) return null;
  try {
    return fs.readFileSync(txtPath, "utf8").trim() || null;
  } catch {
    return null;
  }
}

/** Écrit seulement le fichier texte legacy (sans JSON). Éviter pour les nouveaux flux. */
export function writeTranscriptSidecarFile(uploadPathOrPublicUrl: string, transcript: string): void {
  const trimmed = transcript.trim();
  if (!trimmed) return;
  const relative = normalizeUploadRelativePath(uploadPathOrPublicUrl);
  if (!relative) return;
  const out = transcriptSidecarPathForPublicUpload(relative);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, trimmed, "utf8");
}
