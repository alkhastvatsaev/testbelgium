import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firestore, auth, isConfigured } from "@/core/config/firebase";
import { collection, onSnapshot, doc, setDoc, query, where } from "firebase/firestore";
import { Intervention } from "./types";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";

const MOCK_INTERVENTIONS: Intervention[] = [
  {
    id: "1",
    title: "Porte claquée",
    address: "Mont des Arts, Bruxelles",
    time: "Maintenant",
    status: "in_progress",
    location: { lat: 50.84655, lng: 4.35415 },
  },
  {
    id: "2",
    title: "Changement de cylindre",
    address: "Grand Place, Bruxelles",
    time: "14:30",
    status: "pending",
    location: { lat: 50.8468, lng: 4.3528 },
  },
  {
    id: "3",
    title: "Ouverture de coffre-fort",
    address: "Avenue Louise, Bruxelles",
    time: "11:00",
    status: "done",
    location: { lat: 50.84, lng: 4.36 },
  },
];

export function useInterventions() {
  const workspace = useCompanyWorkspaceOptional();
  const tenantCompanyId =
    workspace?.isTenantUser && workspace.activeCompanyId ? workspace.activeCompanyId : null;

  const [interventions, setInterventions] = useState<Intervention[]>(MOCK_INTERVENTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !firestore || !auth) {
      setLoading(false);
      return () => {};
    }

    let unsubSnap: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubSnap?.();
      unsubSnap = undefined;

      const db = firestore;
      if (!user || !db) {
        setLoading(false);
        return;
      }

      const intRef = tenantCompanyId
        ? query(collection(db, "interventions"), where("companyId", "==", tenantCompanyId))
        : collection(db, "interventions");

      unsubSnap = onSnapshot(
        intRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const parsed = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Intervention));
            setInterventions(parsed);
          } else if (!tenantCompanyId) {
            MOCK_INTERVENTIONS.forEach(async (i) => {
              await setDoc(doc(collection(db, "interventions"), i.id), i);
            });
          } else {
            setInterventions([]);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Erreur lecture interventions Firestore (Offline mode actif ?):", error);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, [tenantCompanyId]);

  return { interventions, loading };
}
