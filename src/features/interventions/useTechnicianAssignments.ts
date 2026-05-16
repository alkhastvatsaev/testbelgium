import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query } from "firebase/firestore";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import {
  DEMO_TECHNICIAN_UID,
  devUiPreviewEnabled,
  realInterventionsOnly,
  stripKnownSyntheticInterventions,
} from "@/core/config/devUiPreview";
import { useDashboardSelectedDate } from "@/context/DateContext";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import type { Intervention } from "@/features/interventions/types";
import { TECHNICIAN_ASSIGNMENTS_QUERY_KEY } from "@/features/offline/technicianQueryKeys";
import { generateDailyAssignmentsAsInterventions } from "@/utils/dailyMockAssignments";
import { isInterventionReleasedToTechnicianField } from "@/features/interventions/technicianSchedule";
import {
  getTechnicianAssignmentUid,
  matchesAssignedTechnician,
} from "@/features/interventions/technicianAssignmentActions";
import { getDefaultAssignedTechnicianUid } from "@/features/interventions/defaultAssignedTechnicianUid";

export type UseTechnicianAssignmentsResult = {
  interventions: Intervention[];
  loading: boolean;
  error: string | null;
  firebaseUid: string | null;
};

/**
 * Temps réel — interventions visibles par le technicien **après** le goulot IVANA
 * (les dossiers `pending` / `pending_needs_address` restent dans « Demandes » uniquement).
 * Sources : assignées au technicien, repli démo, pool société une fois libérées du statut intake.
 */
export function useTechnicianAssignments(): UseTechnicianAssignmentsResult {
  const queryClient = useQueryClient();
  const dashboardDate = useDashboardSelectedDate();
  const workspace = useCompanyWorkspaceOptional();
  const tenantCompanyId = useMemo(() => {
    const id = workspace?.activeCompanyId?.trim();
    if (!workspace?.isTenantUser || !id) return null;
    return id;
  }, [workspace?.isTenantUser, workspace?.activeCompanyId]);

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
    const filterReleased = (rows: Intervention[]) => {
      const uid = (firebaseUid ?? "").trim();
      if (!uid) return [];
      return rows.filter((iv) => {
        if (!isInterventionReleasedToTechnicianField(iv)) return false;
        return matchesAssignedTechnician(iv, uid);
      });
    };

    const defaultTechUid = getDefaultAssignedTechnicianUid();
    if (
      devUiPreviewEnabled &&
      firebaseUid === defaultTechUid &&
      !realInterventionsOnly
    ) {
      const mockRows = generateDailyAssignmentsAsInterventions(dashboardDate);
      const map = new Map(mockRows.map((r) => [r.id, r]));
      firestoreInterventions.forEach((r) => map.set(r.id, r));
      return filterReleased(Array.from(map.values()));
    }
    return stripKnownSyntheticInterventions(filterReleased(firestoreInterventions));
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
        setFirebaseUid(getTechnicianAssignmentUid(DEMO_TECHNICIAN_UID));
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

      const authUid =
        devUiPreviewEnabled && (!user || user.isAnonymous)
          ? DEMO_TECHNICIAN_UID
          : user?.uid ?? null;
      const technicianUid = getTechnicianAssignmentUid(authUid);

      queryClient.removeQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === TECHNICIAN_ASSIGNMENTS_QUERY_KEY &&
          q.queryKey[1] !== technicianUid,
      });

      if (!technicianUid) {
        setFirebaseUid(null);
        setError(null);
        setSnapshotReady(true);
        return;
      }

      setFirebaseUid(technicianUid);
      setSnapshotReady(false);
      setError(null);

      const db = firestore!;
      
      // Requête ultra-simple : on écoute toute la collection. 
      // Les règles Firestore se chargeront de filtrer ce que l'utilisateur a le droit de voir.
      const q = query(collection(db, "interventions"));

      unsubSnap = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
          queryClient.setQueryData([TECHNICIAN_ASSIGNMENTS_QUERY_KEY, technicianUid], data);
          setSnapshotReady(true);
          setError(null);
        },
        (e) => {
          console.error("[useTechnicianAssignments]", e);
          // Si erreur de permission, on peut essayer de filtrer plus agressivement
          setError(e.message || "Erreur Firestore");
          setSnapshotReady(true);
        }
      );
    });

    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, [queryClient, tenantCompanyId]);

  return { interventions, loading, error, firebaseUid };
}
