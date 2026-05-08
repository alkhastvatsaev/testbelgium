"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { DEMO_COMPANY_ID, devUiPreviewEnabled } from "@/core/config/devUiPreview";
import type { Intervention } from "@/features/interventions/types";
import { demoInterventionsForCompany } from "@/features/dev/demoInterventions";

/** Flux temps réel des interventions d'une société (back-office). */
export function useBackOfficeInterventions(companyId: string | null) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const skipFirestoreDemo =
    devUiPreviewEnabled &&
    (!isConfigured ||
      !firestore ||
      !auth ||
      !auth.currentUser ||
      auth.currentUser.isAnonymous);

  useEffect(() => {
    if (skipFirestoreDemo) {
      const cid = (companyId ?? "").trim() || DEMO_COMPANY_ID;
      setInterventions(demoInterventionsForCompany(cid));
      setLoading(false);
      setError(null);
      return () => {};
    }

    if (!isConfigured || !firestore) {
      setInterventions([]);
      setLoading(false);
      setError(null);
      return () => {};
    }

    const cid = (companyId ?? "").trim();
    if (!cid) {
      setInterventions([]);
      setLoading(false);
      setError(null);
      return () => {};
    }

    setLoading(true);
    const q = query(collection(firestore, "interventions"), where("companyId", "==", cid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setInterventions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention)));
        setLoading(false);
        setError(null);
      },
      (e) => {
        console.error("Back-office interventions snapshot:", e);
        setError(e.message || "Erreur Firestore");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [companyId, skipFirestoreDemo]);

  const firebaseUid = auth?.currentUser?.uid ?? null;

  return { interventions, loading, error, firebaseUid };
}
