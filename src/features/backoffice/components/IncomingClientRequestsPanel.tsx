"use client";

import { ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
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
      <div className={cn(GLASS_PANEL_BODY_SCROLL_COMPACT, "flex min-h-0 flex-1 flex-col gap-5")}>
        {loading ? (
          <div className="space-y-2 py-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-[20px] bg-slate-200/55" />
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
          <>
            {pendingRequests.map((req, index) => {
              const clientName = [req.clientFirstName, req.clientLastName].filter(Boolean).join(" ") || "Client Anonyme";
              const location = req.address ? ` - ${req.address}` : "";
              
              const cardClass = "shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)] hover:shadow-[0_14px_32px_-10px_rgba(15,23,42,0.18)]";

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`group relative grid cursor-pointer grid-cols-1 items-center gap-2 rounded-[20px] bg-white px-4 py-4 transition-all duration-300 hover:bg-white ${cardClass}`}
                >
                  <h3 className="text-[14px] font-semibold text-slate-800 truncate text-center">
                    {clientName}{location}
                  </h3>
                </motion.div>
              );
            })}
          </>
        ) : null}
      </div>
    </div>
  );
}
