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
  const assignmentsDateKey = dashboardDate.toLocaleDateString("en-CA");
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshotReady, setSnapshotReady] = useState(false);

  const skipFirestoreAssignments =
    devUiPreviewEnabled &&
    (!isConfigured ||
      !firestore ||
      !auth ||
      !auth.currentUser ||
      auth.currentUser.isAnonymous);

  const queryUid = skipFirestoreAssignments ? DEMO_TECHNICIAN_UID : firebaseUid;

  const assignmentsQueryKey = useMemo(
    () =>
      skipFirestoreAssignments
        ? ([TECHNICIAN_ASSIGNMENTS_QUERY_KEY, queryUid, assignmentsDateKey] as const)
        : ([TECHNICIAN_ASSIGNMENTS_QUERY_KEY, queryUid] as const),
    [skipFirestoreAssignments, queryUid, assignmentsDateKey],
  );

  const assignmentsQuery = useQuery({
    queryKey: assignmentsQueryKey,
    enabled: Boolean(skipFirestoreAssignments || (firestore && firebaseUid)),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24 * 14,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    queryFn: async () =>
      queryClient.getQueryData<Intervention[]>(assignmentsQueryKey as readonly unknown[]) ?? [],
  });

  const interventions = assignmentsQuery.data ?? [];

  const loading = skipFirestoreAssignments
    ? false
    : Boolean(
        isConfigured &&
          firestore &&
          auth &&
          firebaseUid &&
          !snapshotReady &&
          interventions.length === 0 &&
          !error,
      );

  useEffect(() => {
    if (!skipFirestoreAssignments) return () => {};
    setFirebaseUid(DEMO_TECHNICIAN_UID);
    setSnapshotReady(true);
    setError(null);
    queryClient.setQueryData(
      [TECHNICIAN_ASSIGNMENTS_QUERY_KEY, DEMO_TECHNICIAN_UID, assignmentsDateKey],
      generateDailyAssignmentsAsInterventions(dashboardDate),
    );
    return () => {};
  }, [queryClient, skipFirestoreAssignments, assignmentsDateKey, dashboardDate]);

  useEffect(() => {
    if (skipFirestoreAssignments) return () => {};

    if (!isConfigured || !firestore || !auth) {
      setSnapshotReady(true);
      setFirebaseUid(null);
      queryClient.removeQueries({ queryKey: [TECHNICIAN_ASSIGNMENTS_QUERY_KEY] });
      return () => {};
    }

    let unsubSnap: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubSnap?.();
      unsubSnap = undefined;

      queryClient.removeQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === TECHNICIAN_ASSIGNMENTS_QUERY_KEY &&
          q.queryKey[1] !== user?.uid,
      });

      if (!user) {
        setFirebaseUid(null);
        setError(null);
        setSnapshotReady(true);
        queryClient.removeQueries({ queryKey: [TECHNICIAN_ASSIGNMENTS_QUERY_KEY] });
        return;
      }

      setFirebaseUid(user.uid);
      setSnapshotReady(false);
      setError(null);

      const db = firestore!;
      const qsnap = query(collection(db, "interventions"), where("assignedTechnicianUid", "==", user.uid));

      unsubSnap = onSnapshot(
        qsnap,
        (snapshot) => {
          const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
          queryClient.setQueryData([TECHNICIAN_ASSIGNMENTS_QUERY_KEY, user.uid], rows);
          setSnapshotReady(true);
          setError(null);
        },
        (e) => {
          console.error("[useTechnicianAssignments]", e);
          setError(e.message || "Erreur Firestore");
          setSnapshotReady(true);
          const prev = queryClient.getQueryData<Intervention[]>([
            TECHNICIAN_ASSIGNMENTS_QUERY_KEY,
            user.uid,
          ]);
          if (!prev) {
            queryClient.setQueryData([TECHNICIAN_ASSIGNMENTS_QUERY_KEY, user.uid], []);
          }
        },
      );
    });

    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, [queryClient, skipFirestoreAssignments]);

  return { interventions, loading, error, firebaseUid };
}
