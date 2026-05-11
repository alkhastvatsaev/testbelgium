"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore, isConfigured } from "@/core/config/firebase";
import type { Intervention } from "@/features/interventions/types";

/** Snapshot temps réel d’une intervention (facture auto + statuts). */
export function useInterventionLive(interventionId: string | null, enabled = true): Intervention | null {
  const [data, setData] = useState<Intervention | null>(null);

  useEffect(() => {
    if (!enabled || !interventionId?.trim() || !isConfigured || !firestore) {
      setData(null);
      return () => {};
    }

    const ref = doc(firestore, "interventions", interventionId.trim());
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setData(null);
        return;
      }
      setData({ id: snap.id, ...snap.data() } as Intervention);
    });
  }, [interventionId, enabled]);

  return data;
}
