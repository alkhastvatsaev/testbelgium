import { getAdminDb } from "@/core/config/firebase-admin";
import { readAudioDecisionFromDisk } from "@/core/services/audio/audio-decision-store";

export type DecisionStatus = "none" | "refused" | "created";

function decisionDocIdForUploadFileName(uploadFileName: string): string {
  return uploadFileName.replaceAll("/", "__");
}

export async function readAudioDecisionForUpload(
  uploadFileName: string,
): Promise<{ status: DecisionStatus; updatedAt: string | null }> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("ai_audio_decisions").doc(decisionDocIdForUploadFileName(uploadFileName)).get();
    interface D {
      status?: DecisionStatus;
      updatedAt?: string;
    }
    if (!snap.exists) return { status: "none", updatedAt: null };
    const data = snap.data() as D | undefined;
    const status = data?.status;
    if (status !== "refused" && status !== "created") return { status: "none", updatedAt: data?.updatedAt ?? null };
    return { status, updatedAt: data?.updatedAt ?? null };
  } catch {
    const fromDisk = readAudioDecisionFromDisk(uploadFileName);
    if (!fromDisk) return { status: "none", updatedAt: null };
    return { status: fromDisk.status, updatedAt: fromDisk.updatedAt ?? null };
  }
}
