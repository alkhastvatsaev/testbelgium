import fs from "fs";
import path from "path";
import { isSafeUploadsRelativePath } from "./intervention-json-path";

export type AudioDecisionStatus = "refused" | "created";

export type AudioDecisionRecord = {
  fileName: string;
  status: AudioDecisionStatus;
  updatedAt: string;
  interventionId?: string;
};

function decisionJsonPathForUploadFileName(uploadFileName: string): string {
  const rel = uploadFileName.replace(/\\/g, "/");
  if (!isSafeUploadsRelativePath(rel)) {
    throw new Error("[audio-decision-store] fileName uploads invalide");
  }
  const dir = path.dirname(rel);
  const base = path.basename(rel, path.extname(rel));
  const decisionName = `${base}.decision.json`;
  if (dir === "." || dir === "") return path.join(process.cwd(), "public", "uploads", decisionName);
  return path.join(process.cwd(), "public", "uploads", dir, decisionName);
}

export function readAudioDecisionFromDisk(
  uploadFileName: string
): AudioDecisionRecord | null {
  const rel = uploadFileName.replace(/\\/g, "/");
  if (!isSafeUploadsRelativePath(rel)) return null;
  const p = decisionJsonPathForUploadFileName(uploadFileName);
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as AudioDecisionRecord;
    if (!data?.status || !data.updatedAt) return null;
    if (data.status !== "refused" && data.status !== "created") return null;
    return data;
  } catch {
    return null;
  }
}

export function writeAudioDecisionToDisk(
  uploadFileName: string,
  record: Omit<AudioDecisionRecord, "fileName">
): void {
  const p = decisionJsonPathForUploadFileName(uploadFileName);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(
    p,
    `${JSON.stringify({ fileName: uploadFileName, ...record }, null, 2)}\n`,
    "utf8"
  );
}

