import { doc, getDoc, getDocFromCache } from "firebase/firestore";
import { firestore } from "@/core/config/firebase";
import type { Intervention } from "@/features/interventions/types";

export async function fetchInterventionById(caseId: string): Promise<Intervention | null> {
  const id = caseId.trim();
  if (!firestore || !id) return null;

  const ref = doc(firestore, "interventions", id);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Intervention;
  } catch {
    try {
      const cached = await getDocFromCache(ref);
      if (!cached.exists()) return null;
      return { id: cached.id, ...cached.data() } as Intervention;
    } catch {
      return null;
    }
  }
}
