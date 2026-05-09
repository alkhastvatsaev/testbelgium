import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { DEMO_TECHNICIAN_UID, devUiPreviewEnabled } from "@/core/config/devUiPreview";
import { useDashboardSelectedDate } from "@/context/DateContext";
import type { Intervention } from "@/features/interventions/types";
import { TECHNICIAN_ASSIGNMENTS_QUERY_KEY } from "@/features/offline/technicianQueryKeys";
import { generateDailyAssignmentsAsInterventions } from "@/utils/dailyMockAssignments";

export type UseTechnicianAssignmentsResult = {
  interventions: Intervention[];
  loading: boolean;
  error: string | null;
  firebaseUid: string | null;
};

/**
 * Temps réel — uniquement les interventions dont `assignedTechnicianUid` correspond au technicien connecté.
 * Données persistées localement via TanStack Query pour consultation hors ligne (Firestore garde aussi son cache).
 */
export function useTechnicianAssignments(): UseTechnicianAssignmentsResult {
  const queryClient = useQueryClient();
  const dashboardDate = useDashboardSelectedDate();
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshotReady, setSnapshotReady] = useState(false);

  const assignmentsQueryKey = useMemo(
    () => [TECHNICIAN_ASSIGNMENTS_QUERY_KEY, firebaseUid] as const,
    [firebaseUid],
  );

  const assignmentsQuery = useQuery({
    queryKey: assignmentsQueryKey,
    enabled: Boolean(firebaseUid),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24 * 14,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    queryFn: async () =>
      queryClient.getQueryData<Intervention[]>(assignmentsQueryKey as readonly unknown[]) ?? [],
  });

  const firestoreInterventions = assignmentsQuery.data ?? [];

  const interventions = useMemo(() => {
    if (devUiPreviewEnabled && firebaseUid === DEMO_TECHNICIAN_UID) {
      const mockRows = generateDailyAssignmentsAsInterventions(dashboardDate);
      const map = new Map(mockRows.map(r => [r.id, r]));
      firestoreInterventions.forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    }
    return firestoreInterventions;
  }, [firestoreInterventions, dashboardDate, firebaseUid]);

  const loading = Boolean(
    isConfigured &&
      firestore &&
      auth &&
      firebaseUid &&
      !snapshotReady &&
      firestoreInterventions.length === 0 &&
      !error,
  );

  useEffect(() => {
    if (!isConfigured || !firestore || !auth) {
      if (devUiPreviewEnabled) {
        setFirebaseUid(DEMO_TECHNICIAN_UID);
        setSnapshotReady(true);
        setError(null);
      } else {
        setSnapshotReady(true);
        setFirebaseUid(null);
      }
      return () => {};
    }

    let unsubSnap: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubSnap?.();
      unsubSnap = undefined;

      const effectiveUid = devUiPreviewEnabled && (!user || user.isAnonymous) 
        ? DEMO_TECHNICIAN_UID 
        : user?.uid;

      queryClient.removeQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === TECHNICIAN_ASSIGNMENTS_QUERY_KEY &&
          q.queryKey[1] !== effectiveUid,
      });

      if (!effectiveUid) {
        setFirebaseUid(null);
        setError(null);
        setSnapshotReady(true);
        return;
      }

      setFirebaseUid(effectiveUid);
      setSnapshotReady(false);
      setError(null);

      const db = firestore!;
      const qsnap = query(
        collection(db, "interventions"),
        where("assignedTechnicianUid", "==", effectiveUid)
      );

      unsubSnap = onSnapshot(
        qsnap,
        (snapshot) => {
          const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
          queryClient.setQueryData([TECHNICIAN_ASSIGNMENTS_QUERY_KEY, effectiveUid], rows);
          setSnapshotReady(true);
          setError(null);
        },
        (e) => {
          console.error("[useTechnicianAssignments]", e);
          setError(e.message || "Erreur Firestore");
          setSnapshotReady(true);
        },
      );
    });

    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, [queryClient]);

  return { interventions, loading, error, firebaseUid };
}
