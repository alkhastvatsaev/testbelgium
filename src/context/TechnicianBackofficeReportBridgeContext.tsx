"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

  const pushReport = useCallback(
    (p: { interventionId: string; photoDataUrls: string[]; signaturePngDataUrl: string }) => {
      const localId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setReports((prev) =>
        [{ ...p, localId, receivedAt: Date.now() }, ...prev].slice(0, MAX_BRIDGE_REPORTS),
      );
    },
    [],
  );

  const dismissReport = useCallback((localId: string) => {
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
