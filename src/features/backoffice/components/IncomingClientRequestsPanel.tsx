"use client";

import { ClipboardList } from "lucide-react";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { cn } from "@/lib/utils";
import { useBackOfficeInterventions } from "@/features/backoffice/useBackOfficeInterventions";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

export default function IncomingClientRequestsPanel() {
  const workspace = useCompanyWorkspaceOptional();
  
  const cid = workspace?.isTenantUser ? workspace.activeCompanyId : null;
  const { interventions, loading } = useBackOfficeInterventions(cid);

  // Filtre pour ne garder que les demandes en attente
  const pendingRequests = interventions
    .filter((inv) => inv.status === "pending")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!workspace || !workspace.isTenantUser || !workspace.memberships.length) {
    return (
      <div
        data-testid="incoming-requests-gate"
        style={outfit}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] px-4 py-6"
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-[16px] border border-amber-200/50 bg-amber-50/80 px-4 py-5 text-[13px] shadow-[0_14px_36px_-18px_rgba(15,23,42,0.12)]">
          <p className="text-amber-800 font-medium">Société requise pour voir les demandes.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="incoming-requests-panel"
      style={outfit}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
    >
      <div className={cn(GLASS_PANEL_BODY_SCROLL_COMPACT, "flex min-h-0 flex-1 flex-col gap-3")}>
        {loading ? (
          <div className="space-y-2 py-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[16px] bg-slate-200/55" />
            ))}
          </div>
        ) : null}

        {!loading && pendingRequests.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-[22px] border border-dashed border-black/[0.08] bg-white/60 px-5 py-8 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 font-medium">Aucune nouvelle demande</p>
          </div>
        ) : null}

        {!loading && pendingRequests.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex flex-col gap-1.5 rounded-[16px] border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 line-clamp-1">{req.problem || req.title}</span>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">
                    {new Date(req.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {req.address && (
                  <p className="text-[13px] text-slate-600 line-clamp-1">{req.address}</p>
                )}
                {(req.clientFirstName || req.clientLastName || req.clientPhone) && (
                  <p className="text-[12px] text-slate-500">
                    {[req.clientFirstName, req.clientLastName].filter(Boolean).join(" ")}
                    {req.clientPhone ? ` • ${req.clientPhone}` : ""}
                  </p>
                )}
                {req.urgency && (
                   <div className="mt-1 flex">
                     <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
                       Urgence: {req.urgency}
                     </span>
                   </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
