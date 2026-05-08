"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type TechnicianCaseIntentApi = {
  pendingCaseId: string | null;
  setPendingCaseId: (id: string | null) => void;
};

const TechnicianCaseIntentContext = createContext<TechnicianCaseIntentApi | null>(null);

export function TechnicianCaseIntentProvider({ children }: { children: ReactNode }) {
  const [pendingCaseId, setPendingCaseIdState] = useState<string | null>(null);

  const setPendingCaseId = useCallback((id: string | null) => {
    setPendingCaseIdState(id?.trim() ? id.trim() : null);
  }, []);

  const value = useMemo(
    () => ({ pendingCaseId, setPendingCaseId }),
    [pendingCaseId, setPendingCaseId],
  );

  return (
    <TechnicianCaseIntentContext.Provider value={value}>{children}</TechnicianCaseIntentContext.Provider>
  );
}

export function useTechnicianCaseIntent(): TechnicianCaseIntentApi {
  const ctx = useContext(TechnicianCaseIntentContext);
  if (!ctx) {
    throw new Error("useTechnicianCaseIntent doit être utilisé sous TechnicianCaseIntentProvider.");
  }
  return ctx;
}
