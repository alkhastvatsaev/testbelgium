"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronRight, ClipboardList, Clock3, MapPin, User, X } from "lucide-react";
import { toast } from "sonner";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { auth, isConfigured } from "@/core/config/firebase";
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";
import { useDashboardSelectedDate } from "@/context/DateContext";
import { useTechnicianCaseIntent } from "@/context/TechnicianCaseIntentContext";
import { useTechnicianFinishJob } from "@/context/TechnicianFinishJobContext";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import {
  navigateTechnicianHub,
  TECHNICIAN_HUB_ANCHOR_FINISH,
} from "@/features/interventions/technicianHubNavigation";
import InterventionInvoiceButton from "@/features/interventions/components/InterventionInvoiceButton";
import InterventionScheduleEditor from "@/features/interventions/components/InterventionScheduleEditor";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { useInterventionLive } from "@/features/interventions/useInterventionLive";
import type { Intervention } from "@/features/interventions/types";
import type { TechnicianTabFilter } from "@/features/interventions/technicianSchedule";
import {
  formatScheduledLabel,
  interventionClientLabel,
  interventionMatchesTab,
  sortInterventionsByScheduleAsc,
  statusLabelFr,
} from "@/features/interventions/technicianSchedule";
import { fetchInterventionById } from "@/features/interventions/technicianCaseFetch";
import { useTechnicianAssignments } from "@/features/interventions/useTechnicianAssignments";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const tabBtn =
  "min-h-[52px] flex-1 rounded-[18px] border px-2 py-2 text-center shadow-[0_8px_22px_-10px_rgba(15,23,42,0.18)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20";

function statusTone(status: Intervention["status"]): string {
  switch (status) {
    case "done":
      return "bg-emerald-500/12 text-emerald-900 ring-1 ring-emerald-500/25";
    case "invoiced":
      return "bg-violet-500/12 text-violet-950 ring-1 ring-violet-500/28";
    case "in_progress":
      return "bg-sky-500/12 text-sky-950 ring-1 ring-sky-500/28";
    case "pending_needs_address":
      return "bg-rose-500/11 text-rose-950 ring-1 ring-rose-400/25";
    default:
      return "bg-amber-500/12 text-amber-950 ring-1 ring-amber-400/28";
  }
}

function CaseCard({
  iv,
  onOpen,
}: {
  iv: Intervention;
  onOpen: () => void;
}) {
  const client = interventionClientLabel(iv);
  const schedule = formatScheduledLabel(iv);
  const statusFr = statusLabelFr(iv.status);

  return (
    <button
      type="button"
      data-testid={`technician-case-${iv.id}`}
      aria-label={`Dossier ${iv.id}, ${client}`}
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-[22px] border border-black/[0.06] bg-white/92 px-4 py-4 text-left shadow-[0_14px_36px_-18px_rgba(15,23,42,0.22)] transition hover:bg-white active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Dossier <span className="text-slate-600">{iv.id}</span>
          </p>
          <p className="mt-1 truncate text-[16px] font-bold text-slate-900">{client}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(iv.status)}`}>
          {statusFr}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 text-[13px] font-medium text-slate-600">
        <span className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="line-clamp-2">{iv.address || "Adresse à préciser"}</span>
        </span>
        <span className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span>{schedule}</span>
        </span>
      </div>

      <span className="flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-400">
        Ouvrir
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}

function CaseDetail({
  iv,
  onClose,
  onStartFinishJob,
}: {
  iv: Intervention;
  onClose: () => void;
  onStartFinishJob?: () => void;
}) {
  const workspace = useCompanyWorkspaceOptional();
  const liveIv = useInterventionLive(iv.id);
  const merged = liveIv ?? iv;
  const client = interventionClientLabel(merged);
  const showAdminInvoice = workspace?.activeRole === "admin";
  const canFinish = merged.status !== "done" && merged.status !== "invoiced";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="technician-detail-title"
      data-testid="technician-detail-drawer"
      className="absolute inset-0 z-50 flex min-h-0 flex-col rounded-[inherit] bg-[rgb(252,252,253)]/96 backdrop-blur-md"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
        <div className="min-w-0">
          <p id="technician-detail-title" className="truncate text-[17px] font-bold text-slate-900">
            {client}
          </p>
          <p className="font-mono text-[11px] font-semibold text-slate-500">
            Dossier <span className="text-slate-700">{merged.id}</span>
          </p>
        </div>
        <button
          type="button"
          data-testid="technician-detail-close"
          aria-label="Fermer le détail"
          onClick={onClose}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition hover:bg-slate-800"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-4 px-4 py-4`}>
        {canFinish && onStartFinishJob ? (
          <button
            type="button"
            data-testid="technician-finish-job-start"
            onClick={onStartFinishJob}
            className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[22px] bg-emerald-600 px-4 text-[17px] font-bold text-white shadow-[0_14px_40px_-14px_rgba(5,150,105,0.55)] transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            <Camera className="h-6 w-6 shrink-0" aria-hidden />
            Terminer
          </button>
        ) : null}

        {showAdminInvoice ? (
          <div className="rounded-[18px] border border-black/[0.06] bg-white/90 px-4 py-4 shadow-sm">
            <p className="sr-only">La facture PDF peut être générée une fois la checklist complète.</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Facture PDF</p>
            <div className="mt-3">
              <InterventionInvoiceButton iv={liveIv ?? merged} variant="detailDrawer" />
            </div>
          </div>
        ) : null}

        <InterventionScheduleEditor intervention={merged} isAdmin={showAdminInvoice} />

        <div className="rounded-[18px] border border-black/[0.06] bg-white/90 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Statut</p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900">{statusLabelFr(merged.status)}</p>
        </div>

        <div className="rounded-[18px] border border-black/[0.06] bg-white/90 px-4 py-3 shadow-sm">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Horaire prévu
          </p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900">{formatScheduledLabel(merged)}</p>
        </div>

        <div className="rounded-[18px] border border-black/[0.06] bg-white/90 px-4 py-3 shadow-sm">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Adresse
          </p>
          <p className="mt-1 text-[15px] font-medium leading-snug text-slate-800">{merged.address || "—"}</p>
        </div>

        {merged.phone ? (
          <div className="rounded-[18px] border border-black/[0.06] bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Téléphone</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">{merged.phone}</p>
          </div>
        ) : null}

        <div className="rounded-[18px] border border-black/[0.06] bg-white/90 px-4 py-3 shadow-sm">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <User className="h-3.5 w-3.5" aria-hidden />
            Intitulé
          </p>
          <p className="mt-1 text-[15px] font-medium text-slate-800">{merged.title || "—"}</p>
        </div>

        {merged.problem ? (
          <div className="rounded-[18px] border border-black/[0.06] bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Problème</p>
            <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-slate-700">{merged.problem}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TechnicianDashboardPanel() {
  const { pendingCaseId, setPendingCaseId } = useTechnicianCaseIntent();
  const { setFinishJobInterventionId } = useTechnicianFinishJob();
  const pager = useDashboardPagerOptional();
  const { interventions, loading, error, firebaseUid } = useTechnicianAssignments();
  const dashboardSelectedDate = useDashboardSelectedDate();
  const [tab, setTab] = useState<TechnicianTabFilter>("today");
  const [detail, setDetail] = useState<Intervention | null>(null);

  const tabAnchorDate = useMemo(() => {
    const previewAnonymous =
      devUiPreviewEnabled &&
      (!auth || !auth.currentUser || auth.currentUser.isAnonymous);
    return previewAnonymous ? dashboardSelectedDate : new Date();
  }, [dashboardSelectedDate]);

  const filteredSorted = useMemo(() => {
    const matched = interventions.filter((iv) => interventionMatchesTab(iv, tab, tabAnchorDate));
    return sortInterventionsByScheduleAsc(matched);
  }, [interventions, tab, tabAnchorDate]);

  const tabCounts = useMemo(
    () => ({
      today: interventions.filter((iv) => interventionMatchesTab(iv, "today", tabAnchorDate)).length,
      week: interventions.filter((iv) => interventionMatchesTab(iv, "week", tabAnchorDate)).length,
      all: interventions.length,
    }),
    [interventions, tabAnchorDate],
  );

  useEffect(() => {
    if (!pendingCaseId || !firebaseUid) return;
    let cancelled = false;
    void (async () => {
      const iv = await fetchInterventionById(pendingCaseId);
      if (cancelled) return;
      setPendingCaseId(null);
      if (iv) {
        setDetail(iv);
        toast.success("Dossier ouvert");
      } else {
        toast.error("Dossier introuvable", { description: "Permissions ou ID incorrect." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingCaseId, firebaseUid, setPendingCaseId]);

  const offlineAuth = !isConfigured || !auth;

  return (
    <div
      data-testid="technician-dashboard"
      style={outfit}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
      aria-label="Missions assignées"
    >
      <div
        className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex min-h-0 flex-1 flex-col gap-3`}
      >
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-slate-900 text-white shadow-md">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="sr-only">Missions</h2>
        </div>

        {offlineAuth ? (
          <p className="rounded-[14px] border border-amber-200/50 bg-amber-50/80 px-3 py-2 text-[12px] font-medium text-amber-950">
            Connexion requise pour vos missions assignées.
          </p>
        ) : null}

        {!offlineAuth && !firebaseUid ? (
          <p data-testid="technician-dashboard-login-hint" className="text-[12px] font-medium text-slate-600">
            Connectez-vous pour charger vos missions.
          </p>
        ) : null}

        {error ? (
          <p
            data-testid="technician-dashboard-error"
            className="rounded-[16px] border border-rose-200/60 bg-rose-50/90 px-3 py-3 text-[13px] font-medium text-rose-900"
          >
            {error}
          </p>
        ) : null}

        <div className="flex shrink-0 gap-2" role="tablist" aria-label="Filtrer les interventions">
          {(
            [
              ["today", "Aujourd'hui", tabCounts.today],
              ["week", "Cette semaine", tabCounts.week],
              ["all", "Toutes", tabCounts.all],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              data-testid={`technician-tab-${key}`}
              onClick={() => setTab(key)}
              className={
                tab === key
                  ? `${tabBtn} border-slate-900 bg-slate-900 text-white`
                  : `${tabBtn} border-black/[0.07] bg-white/95 text-slate-800 hover:bg-white`
              }
            >
              <span className="flex flex-col items-center justify-center gap-0.5 py-0.5">
                <span className="text-[22px] font-bold leading-none tabular-nums">{count}</span>
                <span className="text-[11px] font-bold leading-tight">{label}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {loading && firebaseUid ? (
            <div data-testid="technician-dashboard-loading" className="space-y-2 py-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[124px] animate-pulse rounded-[22px] bg-slate-200/55"
                  aria-hidden
                />
              ))}
            </div>
          ) : null}

          {!loading && firebaseUid && filteredSorted.length === 0 ? (
            <div
              data-testid="technician-dashboard-empty"
              className="flex flex-1 flex-col items-center justify-center rounded-[22px] border border-dashed border-black/[0.08] bg-white/60 px-5 py-8 text-center"
            >
              <p className="text-[14px] font-bold text-slate-800">Aucune mission</p>
              <p className="sr-only">
                Aucune mission assignée dans cette plage ; essayez un autre filtre ou vérifiez le dispatch.
              </p>
            </div>
          ) : null}

          {!loading && firebaseUid && filteredSorted.length > 0 ? (
            <ul className="flex min-h-0 flex-1 flex-col gap-2 pb-1" aria-label="Liste des interventions">
              {filteredSorted.map((iv) => (
                <li key={iv.id}>
                  <CaseCard iv={iv} onOpen={() => setDetail(iv)} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {detail ? (
        <CaseDetail
          iv={detail}
          onClose={() => setDetail(null)}
          onStartFinishJob={
            () => {
                  setFinishJobInterventionId(detail.id);
                  setDetail(null);
                  navigateTechnicianHub(pager, TECHNICIAN_HUB_ANCHOR_FINISH);
                }
          }
        />
      ) : null}
    </div>
  );
}
