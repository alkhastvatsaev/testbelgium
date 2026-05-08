"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type TechnicianFinishJobApi = {
  finishJobInterventionId: string | null;
  setFinishJobInterventionId: (id: string | null) => void;
};

const TechnicianFinishJobContext = createContext<TechnicianFinishJobApi | null>(null);

export function TechnicianFinishJobProvider({ children }: { children: ReactNode }) {
  const [finishJobInterventionId, setFinishJobInterventionIdState] = useState<string | null>(null);

  const setFinishJobInterventionId = useCallback((id: string | null) => {
    setFinishJobInterventionIdState(id?.trim() ? id.trim() : null);
  }, []);

  const value = useMemo(
    (): TechnicianFinishJobApi => ({ finishJobInterventionId, setFinishJobInterventionId }),
    [finishJobInterventionId, setFinishJobInterventionId],
  );

  return (
    <TechnicianFinishJobContext.Provider value={value}>{children}</TechnicianFinishJobContext.Provider>
  );
}

export function useTechnicianFinishJob(): TechnicianFinishJobApi {
  const ctx = useContext(TechnicianFinishJobContext);
  if (!ctx) {
    throw new Error("useTechnicianFinishJob doit être utilisé sous TechnicianFinishJobProvider.");
  }
  return ctx;
}
