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
import { toast } from "sonner";
import {
  flushCompletionQueue,
  getCompletionQueueLength,
  subscribeCompletionQueueChanged,
} from "@/features/offline/completionSync";

export type OfflineSyncContextValue = {
  navigatorOnline: boolean;
  pendingCompletionCount: number;
  isSyncing: boolean;
  flushNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [navigatorOnline, setNavigatorOnline] = useState(true);
  const [pendingCompletionCount, setPendingCompletionCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    const n = await getCompletionQueueLength();
    setPendingCompletionCount(n);
  }, []);

  const runFlushWithToasts = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;

    setIsSyncing(true);
    try {
      const report = await flushCompletionQueue();
      if (report.skippedConflict > 0) {
        toast.message("Conflit résolu", {
          description:
            report.skippedConflict === 1
              ? "Une intervention était déjà terminée sur le serveur — votre copie locale n’a pas été réappliquée."
              : `${report.skippedConflict} interventions déjà terminées sur le serveur — données locales ignorées.`,
        });
      }
      if (report.failed > 0) {
        toast.warning("Synchronisation partielle", {
          description:
            report.failed === 1
              ? "Une entrée n’a pas pu être envoyée. Réessayez dans un instant."
              : `${report.failed} entrées n’ont pas pu être envoyées. Réessayez bientôt.`,
        });
      }
      if (report.uploaded > 0) {
        toast.success("Synchronisation terminée", {
          description:
            report.uploaded === 1 ? "1 intervention mise à jour." : `${report.uploaded} interventions mises à jour.`,
        });
      }
    } finally {
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  const flushNow = useCallback(async () => {
    await runFlushWithToasts();
  }, [runFlushWithToasts]);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    return subscribeCompletionQueueChanged(() => {
      void refreshPendingCount();
    });
  }, [refreshPendingCount]);

  useEffect(() => {
    const syncOnline = () => {
      setNavigatorOnline(true);
      void runFlushWithToasts();
    };
    const syncOffline = () => setNavigatorOnline(false);

    setNavigatorOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    if (typeof window === "undefined") return () => {};

    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOffline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOffline);
    };
  }, [runFlushWithToasts]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.onLine) return;

    let cancelled = false;
    void (async () => {
      const n = await getCompletionQueueLength();
      if (!cancelled && n > 0 && navigator.onLine) await runFlushWithToasts();
    })();

    return () => {
      cancelled = true;
    };
    // Bootstrap uniquement au montage : évite une boucle si la longueur de file ou les handlers change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once on mount
  }, []);

  const value = useMemo(
    () => ({
      navigatorOnline,
      pendingCompletionCount,
      isSyncing,
      flushNow,
      refreshPendingCount,
    }),
    [navigatorOnline, pendingCompletionCount, isSyncing, flushNow, refreshPendingCount],
  );

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync(): OfflineSyncContextValue {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) throw new Error("useOfflineSync doit être utilisé sous OfflineSyncProvider.");
  return ctx;
}

export function useOfflineSyncOptional(): OfflineSyncContextValue | null {
  return useContext(OfflineSyncContext);
}
