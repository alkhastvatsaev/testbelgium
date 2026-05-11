import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { Intervention } from "@/features/interventions/types";
import { findPotentialDuplicateAmong } from "@/features/interventions/duplicateDetectionCore";

export type RecordDuplicateAlertParams = {
  db: Firestore;
  newInterventionId: string;
  companyId: string | null | undefined;
  address: string;
  problem: string;
  createdByUid: string;
};

/**
 * Après création d’une intervention tenant : charge un échantillon récent par société,
 * détecte un doublon probable et persiste une alerte (`docId` = nouvelle intervention).
 */
export async function recordDuplicateAlertIfNeeded(params: RecordDuplicateAlertParams): Promise<void> {
  const { db, newInterventionId, companyId, address, problem, createdByUid } = params;
  const cid = (companyId ?? "").trim();
  if (!cid || !newInterventionId.trim()) return;

  const alertRef = doc(db, "intervention_duplicate_alerts", newInterventionId.trim());
  const existing = await getDoc(alertRef);
  if (existing.exists()) return;

  const q = query(collection(db, "interventions"), where("companyId", "==", cid), limit(200));
  const snap = await getDocs(q);
  const candidates = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));

  const dup = findPotentialDuplicateAmong({
    excludeId: newInterventionId.trim(),
    address,
    problem,
    candidates,
  });

  if (!dup) return;

  const similarProblemPreview = (dup.problem ?? dup.title ?? "").slice(0, 200);
  const similarCreatedAt =
    typeof dup.createdAt === "string" ? dup.createdAt : new Date().toISOString();

  await setDoc(alertRef, {
    companyId: cid,
    newInterventionId: newInterventionId.trim(),
    similarInterventionId: dup.id,
    similarAddress: dup.address ?? "",
    similarProblemPreview,
    similarCreatedAt,
    status: "open",
    createdByUid,
    detectedAt: new Date().toISOString(),
  });
}
