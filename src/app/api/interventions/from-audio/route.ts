import { NextResponse } from "next/server";
import { getAdminDb } from "@/core/config/firebase-admin";
import { readAudioUploadSidecarIfPresent } from "@/core/services/audio/transcript-sidecar";
import { writeAudioDecisionToDisk } from "@/core/services/audio/audio-decision-store";
import {
  isSafeUploadsRelativePath,
  writeInterventionDraftToDisk,
} from "@/core/services/audio/intervention-json-path";
import path from "path";

export const runtime = "nodejs";

function decisionDocIdForUploadFileName(uploadFileName: string): string {
  return uploadFileName.replaceAll("/", "__");
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const token =
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();

  if (!token) return null;

  const q = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${encodeURIComponent(
    token
  )}&country=be&language=fr&limit=1`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as
    | { features?: Array<{ center?: [number, number] }> }
    | null;
  const center = data?.features?.[0]?.center;
  if (!center || center.length !== 2) return null;
  const [lng, lat] = center;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          fileName?: unknown;
          override?: {
            address?: unknown;
            clientName?: unknown;
            phone?: unknown;
            problem?: unknown;
            urgency?: unknown;
            date?: unknown;
            time?: unknown;
          };
        }
      | null;
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    if (!fileName) return NextResponse.json({ error: "fileName manquant" }, { status: 400 });
    if (!isSafeUploadsRelativePath(fileName.replace(/\\/g, "/"))) {
      return NextResponse.json({ error: "fileName invalide" }, { status: 400 });
    }

    const sidecar = readAudioUploadSidecarIfPresent(fileName);
    if (!sidecar?.analysis) {
      return NextResponse.json({ error: "Sidecar introuvable ou invalide" }, { status: 404 });
    }

    const analysis = sidecar.analysis;
    const o = body?.override;
    const overrideAddress = typeof o?.address === "string" ? o.address.trim() : "";
    const overrideProblem = typeof o?.problem === "string" ? o.problem.trim() : "";
    const overridePhone = typeof o?.phone === "string" ? o.phone.trim() : "";
    const overrideClientName = typeof o?.clientName === "string" ? o.clientName.trim() : "";
    const overrideDate = typeof o?.date === "string" ? o.date.trim() : "";
    const overrideTime = typeof o?.time === "string" ? o.time.trim() : "";

    const address = overrideAddress || analysis.adresse?.trim() || null;
    const problem = overrideProblem || analysis.probleme?.trim() || null;
    const title = (problem || "Intervention serrurerie").slice(0, 140);
    const urgency =
      typeof o?.urgency === "boolean" ? o.urgency : Boolean(analysis.urgence);
    const category = analysis.est_serrurerie ? ("serrurerie" as const) : ("autre" as const);
    const transcription = analysis.transcription?.trim() || "";

    const nowIso = new Date().toISOString();
    const location = address ? await geocodeAddress(address) : null;

    // Try Firestore Admin. If it's not configured locally, fallback to disk so the UI still works.
    let db: ReturnType<typeof getAdminDb> | null = null;
    try {
      db = getAdminDb();
    } catch {
      db = null;
    }

    const ref = db ? db.collection("interventions").doc() : null;

    const doc = {
      title,
      address: address ?? "Adresse inconnue",
      time: overrideTime || "Maintenant",
      status: address ? "pending" : "pending_needs_address",
      location: location ?? { lat: 50.8466, lng: 4.3522 }, // fallback Bruxelles pour ne pas casser le type
      phone: overridePhone || sidecar.phone || null,
      clientName: overrideClientName || null,
      urgency,
      category,
      problem,
      date: overrideDate || null,
      hour: overrideTime || null,
      transcription,
      audioUrl: sidecar.publicUrl,
      createdAt: nowIso,
    };

    if (ref) {
      await ref.set(doc);
    }

    let wrote = false;
    if (db && ref) {
      try {
        await db
          .collection("ai_audio_decisions")
          .doc(decisionDocIdForUploadFileName(fileName))
          .set(
            {
              fileName,
              status: "created",
              updatedAt: nowIso,
              interventionId: ref.id,
            },
            { merge: true }
          );
        wrote = true;
      } catch {
        // ignore
      }
    }
    if (!wrote) {
      writeAudioDecisionToDisk(fileName, {
        status: "created",
        updatedAt: nowIso,
        interventionId: ref?.id,
      });
    }

    if (!ref) {
      const uploadsRoot = path.join(process.cwd(), "public", "uploads");
      const diskUrl = writeInterventionDraftToDisk(uploadsRoot, fileName, { id: null, ...doc, storage: "disk" });
      return NextResponse.json({ success: true, interventionId: null, intervention: doc, storage: "disk", url: diskUrl });
    }

    return NextResponse.json({ success: true, interventionId: ref.id, intervention: doc, storage: "firestore" });
  } catch (error) {
    console.error("[interventions/from-audio] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

