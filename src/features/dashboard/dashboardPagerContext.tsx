"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardPagerApi = {
  pageIndex: number;
  pageCount: number;
  setPageIndex: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
};

const DashboardPagerContext = createContext<DashboardPagerApi | null>(null);

type ProviderProps = {
  children: ReactNode;
  /** Nombre d’écrans plein viewport (min. 2). */
  pageCount: number;
  initialPageIndex?: number;
};

export function DashboardPagerProvider({ children, pageCount, initialPageIndex = 0 }: ProviderProps) {
  const safeCount = Math.max(2, Math.floor(pageCount));

  const [pageIndex, setPageIndexState] = useState(initialPageIndex);

  const setPageIndex = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(0, index), safeCount - 1);
      setPageIndexState(clamped);
    },
    [safeCount],
  );

  const goNext = useCallback(() => {
    setPageIndexState((p) => Math.min(p + 1, safeCount - 1));
  }, [safeCount]);

  const goPrev = useCallback(() => {
    setPageIndexState((p) => Math.max(p - 1, 0));
  }, []);

  const value = useMemo(
    () => ({ pageIndex, pageCount: safeCount, setPageIndex, goNext, goPrev }),
    [pageIndex, safeCount, setPageIndex, goNext, goPrev],
  );

  return (
    <DashboardPagerContext.Provider value={value}>{children}</DashboardPagerContext.Provider>
  );
}

export function useDashboardPager(): DashboardPagerApi {
  const ctx = useContext(DashboardPagerContext);
  if (!ctx) {
    throw new Error("useDashboardPager doit être utilisé sous DashboardPagerProvider.");
  }
  return ctx;
}

export function useDashboardPagerOptional(): DashboardPagerApi | null {
  return useContext(DashboardPagerContext);
}
