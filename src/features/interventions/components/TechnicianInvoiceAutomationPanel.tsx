"use client";

import { FileText } from "lucide-react";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

export default function TechnicianInvoiceAutomationPanel() {
  return (
    <div data-testid="technician-invoice-automation-panel" style={outfit} className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-3`}>
      <h2 className="sr-only">Facturation automatique</h2>
      <p className="sr-only">
        Après clôture avec au moins une photo chantier et signature client sur le serveur, une fonction Cloud génère un PDF facture sur Storage et met le statut à Facturé. La checklist doit être complète avant génération.
      </p>
      <div className="flex flex-1 flex-col items-center justify-center rounded-[16px] border border-black/[0.06] bg-white/90 px-3 py-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.14)]">
        <FileText className="h-11 w-11 text-slate-600" aria-hidden />
        <p className="sr-only">
          Après clôture avec checklist complète, génération PDF facture et statut facturé.
        </p>
      </div>
    </div>
  );
}
