"use client";

import { Building2, Bell } from "lucide-react";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { cn } from "@/lib/utils";
import DuplicateAlertsQueue from "@/features/interventions/components/DuplicateAlertsQueue";
import { useOpenDuplicateAlerts } from "@/features/interventions/useOpenDuplicateAlerts";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

/** Page 12 — centre sur les alertes (actions admin + même bandeau que le back-office). */
export default function DuplicateAlertsPanel() {
  const workspace = useCompanyWorkspaceOptional();

  if (!workspace || !workspace.isTenantUser || !workspace.memberships.length) {
    return (
      <div
        data-testid="duplicate-alerts-gate"
        style={outfit}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] px-4 py-6"
      >
        <div
          className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-[16px] border border-amber-200/50 bg-amber-50/80 px-4 py-5 text-[13px] shadow-[0_14px_36px_-18px_rgba(15,23,42,0.12)]"
          aria-labelledby="duplicate-gate-title"
        >
          <p id="duplicate-gate-title" className="sr-only">
            Société requise pour la détection des alertes.
          </p>
          <Building2 className="h-14 w-14 text-amber-700" aria-hidden />
        </div>
      </div>
    );
  }

  const ws = workspace;
  const { openAlerts, loading } = useOpenDuplicateAlerts(ws.activeCompanyId);
  const isAdmin = ws.activeRole === "admin";

  return (
    <div
      data-testid="duplicate-alerts-panel"
      style={outfit}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
      aria-label="Alertes — attention requise"
    >
      <div className={cn(GLASS_PANEL_BODY_SCROLL_COMPACT, "flex min-h-0 flex-1 flex-col gap-3")}>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-rose-600 text-white shadow-md">
            <Bell className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold tracking-tight text-slate-900">Alertes</h2>
            <p className="sr-only">Doublons, conflits et erreurs</p>
          </div>
        </div>

        {loading ? (
          <div data-testid="duplicate-alerts-loading" className="space-y-2 py-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-[22px] bg-slate-200/55" aria-hidden />
            ))}
          </div>
        ) : null}

        {!loading && openAlerts.length === 0 ? (
          <div
            data-testid="duplicate-alerts-empty"
            className="flex flex-1 flex-col items-center justify-center rounded-[22px] border border-dashed border-black/[0.08] bg-white/60 px-5 py-8 text-center"
            aria-label="Aucune alerte à traiter"
          >
            <Bell className="h-10 w-10 text-slate-300" aria-hidden />
            <p className="sr-only">Rien à traiter.</p>
          </div>
        ) : null}

        <DuplicateAlertsQueue openAlerts={openAlerts} isAdmin={isAdmin} variant="full" />
      </div>
    </div>
  );
}
