"use client";

import { ListTodo, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useOfflineSync } from "@/context/OfflineSyncContext";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

/** Page dédiée : rappels hors ligne + actions de synchro (carousel). */
export default function TechnicianOfflineSyncPanel() {
  const { navigatorOnline, pendingCompletionCount, isSyncing, flushNow } = useOfflineSync();

  return (
    <div data-testid="technician-offline-sync-panel" style={outfit} className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-3`}>
      <h2 className="sr-only">Synchronisation hors ligne</h2>
      <p className="sr-only">
        Données et fins d&apos;intervention peuvent être mises en attente localement ; envoi vers Firestore au retour réseau. En cas de conflit avec le serveur, la version serveur l&apos;emporte.
      </p>

      <div className="rounded-[16px] border border-black/[0.06] bg-white/90 px-3 py-3 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.14)]">
        <ul className="space-y-3 text-[13px] font-semibold text-slate-800">
          <li
            className="flex items-center justify-between gap-4"
            aria-label={navigatorOnline ? "Réseau : en ligne" : "Réseau : hors ligne"}
          >
            {navigatorOnline ? (
              <Wifi className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <WifiOff className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            )}
            <span data-testid="offline-sync-network-label" className="sr-only">
              {navigatorOnline ? "En ligne" : "Hors ligne"}
            </span>
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${navigatorOnline ? "bg-emerald-500" : "bg-amber-500"}`}
              aria-hidden
            />
          </li>
          <li
            className="flex items-center justify-between gap-4"
            aria-label={`Interventions en attente d&apos;envoi : ${pendingCompletionCount}`}
          >
            <ListTodo className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            <span data-testid="offline-sync-queue-count" className="tabular-nums text-slate-900">
              {pendingCompletionCount}
            </span>
          </li>
          <li
            className="flex items-center justify-between gap-4"
            aria-label={isSyncing ? "Synchronisation en cours" : "Synchronisation inactive"}
          >
            <RefreshCw className={`h-5 w-5 shrink-0 text-slate-500 ${isSyncing ? "animate-spin" : ""}`} aria-hidden />
            <span data-testid="offline-sync-sync-label" className="sr-only">
              {isSyncing ? "Synchronisation en cours" : "Inactif"}
            </span>
            <span className="tabular-nums text-slate-600" aria-hidden>
              {isSyncing ? "…" : "—"}
            </span>
          </li>
        </ul>
      </div>

      <button
        type="button"
        data-testid="offline-sync-flush-btn"
        disabled={!navigatorOnline || isSyncing || pendingCompletionCount === 0}
        onClick={() => void flushNow()}
        aria-label="Synchroniser les données en attente"
        className="flex min-h-[48px] items-center justify-center rounded-[16px] bg-slate-900 px-4 shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw className={`h-5 w-5 text-white ${isSyncing ? "animate-spin" : ""}`} aria-hidden />
        <span className="sr-only">Synchroniser</span>
      </button>
    </div>
  );
}
