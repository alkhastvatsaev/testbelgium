"use client";

import { CloudOff } from "lucide-react";
import { useOfflineSync } from "@/context/OfflineSyncContext";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

/**
 * Bandeau discret : hors ligne uniquement (la synchro reste silencieuse — toasts côté contexte).
 */
export default function TechnicianConnectivityBar() {
  const { navigatorOnline } = useOfflineSync();

  const showOffline = !navigatorOnline;

  if (!showOffline) return null;

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
    </div>
  );
}
