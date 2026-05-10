"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { DEMO_COMPANY_ID, devUiPreviewEnabled } from "@/core/config/devUiPreview";
import type { CompanyMembershipRow, CompanyRole } from "@/features/company/types";

const ACTIVE_COMPANY_STORAGE_KEY = "belmap_active_company_id";

const DEMO_MEMBERSHIP: CompanyMembershipRow = {
  companyId: DEMO_COMPANY_ID,
  companyName: "Société démo (sans Firebase)",
  role: "admin",
};

export type CompanyWorkspaceApi = {
  firebaseUid: string | null;
  memberships: CompanyMembershipRow[];
  activeCompanyId: string;
  setActiveCompanyId: (id: string) => void;
  activeRole: CompanyRole | null;
  /** Au moins une société — interventions filtrées + création avec tenant */
  isTenantUser: boolean;
  /** Met à jour bmTenants / bmActive côté token (sans toast). */
  refreshClaimsSilent: () => Promise<boolean>;
};

const CompanyWorkspaceContext = createContext<CompanyWorkspaceApi | null>(null);

export function CompanyWorkspaceProvider({ 
  children,
  initialActiveCompanyId 
}: { 
  children: ReactNode;
  initialActiveCompanyId?: string;
}) {
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<CompanyMembershipRow[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState(initialActiveCompanyId ?? "");

  const persistActiveId = useCallback((id: string) => {
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, id);
      else window.localStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
    }
  }, []);

  const setActiveCompanyId = useCallback(
    (id: string) => {
      setActiveCompanyIdState(id);
      persistActiveId(id);
    },
    [persistActiveId],
  );

  useEffect(() => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, (u) => setFirebaseUid(u?.uid ?? null));
  }, []);

  useEffect(() => {
    if (!firestore || !firebaseUid || !isConfigured) {
      setMemberships([]);
      setActiveCompanyIdState("");
      return () => {};
    }

    const membershipsCol = collection(firestore, "users", firebaseUid, "company_memberships");
    return onSnapshot(membershipsCol, (snap) => {
      const rows: CompanyMembershipRow[] = snap.docs.map((d) => {
        const data = d.data() as { role?: string; companyName?: string };
        return {
          companyId: d.id,
          companyName: typeof data.companyName === "string" ? data.companyName : "Sans nom",
          role: data.role === "admin" ? "admin" : "collaborateur",
        };
      });
      setMemberships(rows);

      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY) : null;

      setActiveCompanyIdState((prev) => {
        let next = "";
        if (stored && rows.some((r) => r.companyId === stored)) next = stored;
        else if (prev && rows.some((r) => r.companyId === prev)) next = prev;
        else next = rows[0]?.companyId ?? "";
        if (typeof window !== "undefined") {
          if (next) window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, next);
          else window.localStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
        }
        return next;
      });
    });
  }, [firebaseUid]);

  const demoTenantActive =
    devUiPreviewEnabled &&
    (!isConfigured || !firestore || !firebaseUid || memberships.length === 0);

  const effectiveMemberships = useMemo(
    () => (demoTenantActive ? [DEMO_MEMBERSHIP] : memberships),
    [demoTenantActive, memberships],
  );

  const effectiveActiveCompanyId = useMemo(
    () => (demoTenantActive ? DEMO_COMPANY_ID : activeCompanyId),
    [demoTenantActive, activeCompanyId],
  );

  const refreshClaimsSilent = useCallback(async (): Promise<boolean> => {
    if (demoTenantActive) return false;
    if (!auth?.currentUser || memberships.length === 0 || !activeCompanyId) return false;
    try {
      const idToken = await auth.currentUser.getIdToken(false);
      const res = await fetch("/api/company/sync-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ activeCompanyId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) return false;
      await auth.currentUser.getIdToken(true);
      return true;
    } catch {
      return false;
    }
  }, [activeCompanyId, memberships.length, demoTenantActive]);

  useEffect(() => {
    if (demoTenantActive) return;
    if (!firebaseUid || memberships.length === 0 || !activeCompanyId) return;
    const t = setTimeout(() => {
      void refreshClaimsSilent();
    }, 400);
    return () => clearTimeout(t);
  }, [firebaseUid, memberships.length, activeCompanyId, refreshClaimsSilent, demoTenantActive]);

  const activeRole: CompanyRole | null = useMemo(() => {
    return (
      effectiveMemberships.find((m) => m.companyId === effectiveActiveCompanyId)?.role ?? null
    );
  }, [effectiveMemberships, effectiveActiveCompanyId]);

  const value = useMemo(
    (): CompanyWorkspaceApi => ({
      firebaseUid,
      memberships: effectiveMemberships,
      activeCompanyId: effectiveActiveCompanyId,
      setActiveCompanyId,
      activeRole,
      isTenantUser: demoTenantActive || memberships.length > 0,
      refreshClaimsSilent,
    }),
    [
      firebaseUid,
      effectiveMemberships,
      effectiveActiveCompanyId,
      setActiveCompanyId,
      activeRole,
      refreshClaimsSilent,
      memberships.length,
      demoTenantActive,
    ],
  );

  return <CompanyWorkspaceContext.Provider value={value}>{children}</CompanyWorkspaceContext.Provider>;
}

export function useCompanyWorkspace(): CompanyWorkspaceApi {
  const ctx = useContext(CompanyWorkspaceContext);
  if (!ctx) throw new Error("CompanyWorkspaceProvider manquant.");
  return ctx;
}

/** Hors provider (tests) → null ; comportement dispatch « interne » par défaut. */
export function useCompanyWorkspaceOptional(): CompanyWorkspaceApi | null {
  return useContext(CompanyWorkspaceContext);
}
