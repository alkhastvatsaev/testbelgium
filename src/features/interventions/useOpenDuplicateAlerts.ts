"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import {
  DEMO_COMPANY_ID,
  devUiPreviewEnabled,
  isSyntheticInterventionId,
  realInterventionsOnly,
} from "@/core/config/devUiPreview";
import type { DuplicateAlertDoc, DuplicateAlertRow } from "@/features/interventions/duplicateAlertTypes";

/** Flux temps réel des alertes doublons pour une société (filtrage « open » côté client). */
export function useOpenDuplicateAlerts(companyId: string | null) {
  const [rows, setRows] = useState<DuplicateAlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const skipFirestoreDemo =
    devUiPreviewEnabled &&
    (!isConfigured ||
      !firestore ||
      !auth ||
      !auth.currentUser);

  useEffect(() => {
    if (skipFirestoreDemo) {
      const cid = (companyId ?? "").trim() || DEMO_COMPANY_ID;
      if (realInterventionsOnly || cid !== DEMO_COMPANY_ID) {
        setRows([]);
      } else {
        const similarInterventionId = `mock-day-${new Date().toLocaleDateString("en-CA")}-0`;
        const fakeAlert: DuplicateAlertRow = {
          id: "demo-dup-alert",
          companyId: DEMO_COMPANY_ID,
          newInterventionId: "demo-new-dup",
          similarInterventionId,
          similarAddress: "Rue Neuve 45, 1000 Bruxelles",
          similarProblemPreview: "Clé bloquée",
          similarCreatedAt: new Date().toISOString(),
          status: "open",
          createdByUid: "demo-creator",
          detectedAt: new Date().toISOString(),
        };
        setRows([fakeAlert]);
      }
      setLoading(false);
      return () => {};
    }

    if (!isConfigured || !firestore) {
      setRows([]);
      setLoading(false);
      return () => {};
    }

    const cid = (companyId ?? "").trim();
    if (!cid) {
      setRows([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const q = query(collection(firestore, "intervention_duplicate_alerts"), where("companyId", "==", cid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const parsed = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DuplicateAlertDoc) }));
        setRows(
          parsed.filter(
            (r) =>
              !isSyntheticInterventionId(r.similarInterventionId) &&
              !isSyntheticInterventionId(r.newInterventionId),
          ),
        );
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return () => unsub();
  }, [companyId, skipFirestoreDemo, realInterventionsOnly]);

  const openAlerts = useMemo(() => rows.filter((r) => r.status === "open"), [rows]);

  const firebaseUid = auth?.currentUser?.uid ?? null;

  return { alerts: rows, openAlerts, loading, firebaseUid };
}
