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
import { bridgedReportsDelete, bridgedReportsGetAll, bridgedReportsPut } from "@/features/offline/bridgedReportsDb";

const MAX_BRIDGE_REPORTS = 20;

export type BridgedTechnicianReport = {
  localId: string;
  interventionId: string;
  photoDataUrls: string[];
  signaturePngDataUrl: string;
  receivedAt: number;
};

export type TechnicianBackofficeReportBridgeApi = {
  reports: BridgedTechnicianReport[];
  pushReport: (p: {
    interventionId: string;
    photoDataUrls: string[];
    signaturePngDataUrl: string;
  }) => void;
  dismissReport: (localId: string) => void;
};

const TechnicianBackofficeReportBridgeContext = createContext<TechnicianBackofficeReportBridgeApi | null>(null);

export function TechnicianBackofficeReportBridgeProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<BridgedTechnicianReport[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined") return () => {};

    void bridgedReportsGetAll()
      .then((all) => {
        if (cancelled) return;
        const next = [...all]
          .sort((a, b) => b.receivedAt - a.receivedAt)
          .slice(0, MAX_BRIDGE_REPORTS);
        setReports(next);
        // Prune old records
        const keep = new Set(next.map((r) => r.localId));
        all
          .filter((r) => !keep.has(r.localId))
          .forEach((r) => {
            void bridgedReportsDelete(r.localId);
          });
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pushReport = useCallback(
    (p: { interventionId: string; photoDataUrls: string[]; signaturePngDataUrl: string }) => {
      const localId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const record: BridgedTechnicianReport = { ...p, localId, receivedAt: Date.now() };
      void bridgedReportsPut(record);

      setReports((prev) => {
        const next = [record, ...prev].slice(0, MAX_BRIDGE_REPORTS);
        const removed = prev.slice(MAX_BRIDGE_REPORTS - 1);
        removed.forEach((r) => void bridgedReportsDelete(r.localId));
        return next;
      });
    },
    [],
  );

  const dismissReport = useCallback((localId: string) => {
    void bridgedReportsDelete(localId);
    setReports((prev) => prev.filter((r) => r.localId !== localId));
  }, []);

  const value = useMemo(
    () => ({ reports, pushReport, dismissReport }),
    [reports, pushReport, dismissReport],
  );

  return (
    <TechnicianBackofficeReportBridgeContext.Provider value={value}>
      {children}
    </TechnicianBackofficeReportBridgeContext.Provider>
  );
}

export function useTechnicianBackofficeReportBridgeOptional(): TechnicianBackofficeReportBridgeApi | null {
  return useContext(TechnicianBackofficeReportBridgeContext);
}
