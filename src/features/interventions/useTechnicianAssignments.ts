import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
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
import { getDefaultAssignedTechnicianUid } from "@/features/interventions/defaultAssignedTechnicianUid";
import { isInterventionReleasedToTechnicianField } from "@/features/interventions/technicianSchedule";

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
    const filterReleased = (rows: Intervention[]) =>
      rows.filter((iv) => {
        // Toujours visible si explicitement assigné au technicien courant (permet de voir et démarrer un dossier pending)
        if (firebaseUid && iv.assignedTechnicianUid === firebaseUid) return true;
        
        // Pour le pool société (unassigned), on autorise aussi 'pending' pour que le tech puisse "voir" les nouvelles demandes
        // mais on garde le filtrage strict pour 'pending_needs_address' (dossiers incomplets)
        if (!iv.assignedTechnicianUid && iv.status === "pending") return true;

        // Sinon, on suit la règle standard
        return isInterventionReleasedToTechnicianField(iv);
      });

    if (
      devUiPreviewEnabled &&
      firebaseUid === DEMO_TECHNICIAN_UID &&
      !realInterventionsOnly
    ) {
      const mockRows = generateDailyAssignmentsAsInterventions(dashboardDate);
      const map = new Map(mockRows.map((r) => [r.id, r]));
      firestoreInterventions.forEach((r) => map.set(r.id, r));
      return stripKnownSyntheticInterventions(
        filterReleased(Array.from(map.values())),
      );
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

      const effectiveUid =
        devUiPreviewEnabled && (!user || user.isAnonymous) ? DEMO_TECHNICIAN_UID : user?.uid;

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

      const defaultAssignedUid = getDefaultAssignedTechnicianUid();
      const shouldAlsoListenToDefault =
        Boolean(user) &&
        !user?.isAnonymous &&
        defaultAssignedUid === DEMO_TECHNICIAN_UID &&
        effectiveUid !== DEMO_TECHNICIAN_UID;

      const shouldCompanyPool = Boolean(tenantCompanyId) && Boolean(effectiveUid);

      let latestPrimary: Intervention[] = [];
      let latestFallback: Intervention[] = [];
      let latestUnassignedNull: Intervention[] = [];
      let latestUnassignedEmpty: Intervention[] = [];
      let latestDemoInCompany: Intervention[] = [];

      let primaryReady = false;
      let fallbackReady = !shouldAlsoListenToDefault;
      let unassignedNullReady = !shouldCompanyPool;
      let unassignedEmptyReady = !shouldCompanyPool;
      let demoInCompanyReady = !shouldCompanyPool;

      const publishMerged = () => {
        if (
          !primaryReady ||
          !fallbackReady ||
          !unassignedNullReady ||
          !unassignedEmptyReady ||
          !demoInCompanyReady
        ) {
          return;
        }
        const map = new Map<string, Intervention>();
        latestPrimary.forEach((r) => map.set(r.id, r));
        latestFallback.forEach((r) => map.set(r.id, r));
        if (shouldCompanyPool) {
          latestUnassignedNull.forEach((r) => map.set(r.id, r));
          latestUnassignedEmpty.forEach((r) => map.set(r.id, r));
          latestDemoInCompany.forEach((r) => map.set(r.id, r));
        }
        const merged = Array.from(map.values());
        queryClient.setQueryData([TECHNICIAN_ASSIGNMENTS_QUERY_KEY, effectiveUid], merged);
        setSnapshotReady(true);
        setError(null);
      };

      const qPrimary = query(
        collection(db, "interventions"),
        where("assignedTechnicianUid", "==", effectiveUid),
      );

      const unsubs: Array<() => void> = [];

      const unsubPrimary = onSnapshot(
        qPrimary,
        (snapshot) => {
          latestPrimary = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
          primaryReady = true;
          publishMerged();
        },
        (e) => {
          console.error("[useTechnicianAssignments]", e);
          setError(e.message || "Erreur Firestore");
          setSnapshotReady(true);
        },
      );
      unsubs.push(unsubPrimary);

      if (shouldAlsoListenToDefault) {
        const qFallback = query(
          collection(db, "interventions"),
          where("assignedTechnicianUid", "==", DEMO_TECHNICIAN_UID),
        );
        const unsubFallback = onSnapshot(
          qFallback,
          (snapshot) => {
            latestFallback = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
            fallbackReady = true;
            publishMerged();
          },
          (e) => {
            console.error("[useTechnicianAssignments:fallback]", e);
            fallbackReady = true;
            publishMerged();
          },
        );
        unsubs.push(unsubFallback);
      }

      if (shouldCompanyPool && tenantCompanyId) {
        const cid = tenantCompanyId;

        const qUnNull = query(
          collection(db, "interventions"),
          where("companyId", "==", cid),
          where("assignedTechnicianUid", "==", null),
        );
        unsubs.push(
          onSnapshot(
            qUnNull,
            (snapshot) => {
              latestUnassignedNull = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
              unassignedNullReady = true;
              publishMerged();
            },
            (e) => {
              console.error("[useTechnicianAssignments:unassigned-null]", e);
              unassignedNullReady = true;
              publishMerged();
            },
          ),
        );

        const qUnEmpty = query(
          collection(db, "interventions"),
          where("companyId", "==", cid),
          where("assignedTechnicianUid", "==", ""),
        );
        unsubs.push(
          onSnapshot(
            qUnEmpty,
            (snapshot) => {
              latestUnassignedEmpty = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
              unassignedEmptyReady = true;
              publishMerged();
            },
            (e) => {
              console.error("[useTechnicianAssignments:unassigned-empty]", e);
              unassignedEmptyReady = true;
              publishMerged();
            },
          ),
        );

        const qDemoCo = query(
          collection(db, "interventions"),
          where("companyId", "==", cid),
          where("assignedTechnicianUid", "==", DEMO_TECHNICIAN_UID),
        );
        unsubs.push(
          onSnapshot(
            qDemoCo,
            (snapshot) => {
              latestDemoInCompany = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
              demoInCompanyReady = true;
              publishMerged();
            },
            (e) => {
              console.error("[useTechnicianAssignments:demo-in-company]", e);
              demoInCompanyReady = true;
              publishMerged();
            },
          ),
        );
      }

      unsubSnap = () => {
        unsubs.forEach((u) => u());
      };

      publishMerged();
    });

    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, [queryClient, tenantCompanyId]);

  return { interventions, loading, error, firebaseUid };
}
