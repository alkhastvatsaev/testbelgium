import { NextResponse } from "next/server";
import { getAdminDb } from "@/core/config/firebase-admin";
import { writeAudioDecisionToDisk } from "@/core/services/audio/audio-decision-store";
import { isSafeUploadsRelativePath } from "@/core/services/audio/intervention-json-path";

export const runtime = "nodejs";

type DecisionStatus = "refused" | "created";

function decisionDocIdForUploadFileName(uploadFileName: string): string {
  return uploadFileName.replaceAll("/", "__");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { fileName?: unknown; status?: unknown }
      | null;

    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const status = body?.status;
    if (!fileName) {
      return NextResponse.json({ error: "fileName manquant" }, { status: 400 });
    }
    if (!isSafeUploadsRelativePath(fileName.replace(/\\/g, "/"))) {
      return NextResponse.json({ error: "fileName invalide" }, { status: 400 });
    }
    if (status !== "refused" && status !== "created") {
      return NextResponse.json({ error: "status invalide" }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();
    let wrote = false;
    try {
      const db = getAdminDb();
      await db
        .collection("ai_audio_decisions")
        .doc(decisionDocIdForUploadFileName(fileName))
        .set(
          {
            fileName,
            status: status as DecisionStatus,
            updatedAt,
          },
          { merge: true }
        );
      wrote = true;
    } catch {
      // Admin not configured → fallback disk
    }

    if (!wrote) {
      writeAudioDecisionToDisk(fileName, {
        status: status as DecisionStatus,
        updatedAt,
      });
    }

    return NextResponse.json({ success: true, fileName, status, updatedAt });
  } catch (error) {
    console.error("[audio-decision] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

