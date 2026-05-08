"use client";

import { CloudOff, Loader2, Wifi } from "lucide-react";
import { useOfflineSync } from "@/context/OfflineSyncContext";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

/**
 * Bandeau discret : hors ligne, synchro en cours, file d’attente locale.
 */
export default function TechnicianConnectivityBar() {
  const { navigatorOnline, pendingCompletionCount, isSyncing } = useOfflineSync();

  const showOffline = !navigatorOnline;
  const showSyncing = isSyncing && navigatorOnline;
  const showQueued = !isSyncing && pendingCompletionCount > 0;

  if (!showOffline && !showSyncing && !showQueued) return null;

  return (
    <div
      data-testid="technician-connectivity-bar"
      style={outfit}
      className="pointer-events-none fixed left-4 top-[92px] z-[60] flex max-w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
    >
      {showOffline ? (
        <div
          data-testid="technician-connectivity-offline"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-800/15 bg-slate-900 px-3 py-2 text-[12px] font-bold text-white shadow-lg"
        >
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
          Mode hors ligne
        </div>
      ) : null}

      {showSyncing ? (
        <div
          data-testid="technician-connectivity-syncing"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-emerald-700/25 bg-emerald-700 px-3 py-2 text-[12px] font-bold text-white shadow-lg"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          Synchronisation…
        </div>
      ) : null}

      {showQueued ? (
        <div
          data-testid="technician-connectivity-queued"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-50 px-3 py-2 text-[12px] font-bold text-sky-950 shadow-md"
        >
          <Wifi className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
          {navigatorOnline ? `En attente d’envoi : ${pendingCompletionCount}` : `Stocké hors ligne : ${pendingCompletionCount}`}
        </div>
      ) : null}
    </div>
  );
}
