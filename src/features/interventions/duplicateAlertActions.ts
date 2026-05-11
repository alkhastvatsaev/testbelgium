import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

export async function mergeDuplicateAlert(
  db: Firestore,
  alertDocId: string,
  newInterventionId: string,
  resolvedByUid: string,
): Promise<void> {
  await deleteDoc(doc(db, "interventions", newInterventionId));
  await updateDoc(doc(db, "intervention_duplicate_alerts", alertDocId), {
    status: "merged",
    resolvedAt: new Date().toISOString(),
    resolvedByUid,
  });
}

export async function ignoreDuplicateAlert(db: Firestore, alertDocId: string, resolvedByUid: string): Promise<void> {
  await updateDoc(doc(db, "intervention_duplicate_alerts", alertDocId), {
    status: "ignored",
    resolvedAt: new Date().toISOString(),
    resolvedByUid,
  });
}
