"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CalendarRange, CalendarDays, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Intervention } from "@/features/interventions/types";
import {
  formatScheduledLabel,
  interventionClientLabel,
  statusLabelFr,
} from "@/features/interventions/technicianSchedule";
import { useBackOfficeInterventions } from "@/features/backoffice/useBackOfficeInterventions";
import {
  buildMonthGrid,
  filterScheduledInterventions,
  groupScheduledInterventionsByLocalDay,
  localDayKeyFromParts,
} from "@/features/calendar/calendarGrid";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const WEEKDAY_FR = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseLocalDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

function calendarTodayKey(): string {
  const t = new Date();
  return localDayKeyFromParts(t.getFullYear(), t.getMonth(), t.getDate());
}

export default function InterventionCalendarPanel() {
  const workspace = useCompanyWorkspaceOptional();
  const [companyFilterId, setCompanyFilterId] = useState("");
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    if (workspace?.activeCompanyId) setCompanyFilterId(workspace.activeCompanyId);
  }, [workspace?.activeCompanyId]);

  useEffect(() => {
    const d = new Date();
    setSelectedDayKey(localDayKeyFromParts(d.getFullYear(), d.getMonth(), d.getDate()));
  }, []);

  const tenantReady = Boolean(workspace?.isTenantUser && companyFilterId.trim());
  const { interventions, loading, error } = useBackOfficeInterventions(tenantReady ? companyFilterId : null);

  const scheduledOnly = useMemo(() => filterScheduledInterventions(interventions), [interventions]);
  const byDay = useMemo(() => groupScheduledInterventionsByLocalDay(scheduledOnly), [scheduledOnly]);

  const navigate = useMemo(() => {
    if (viewMode === "month") {
      return {
        prev: () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)),
        next: () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)),
      };
    }
    return {
      prev: () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)),
      next: () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)),
    };
  }, [viewMode]);

  const monthTitle = useMemo(() => {
    const raw = new Intl.DateTimeFormat("fr-BE", { month: "long", year: "numeric" }).format(viewDate);
    return raw.replace(/^\w/, (c) => c.toUpperCase());
  }, [viewDate]);

  const weekTitle = useMemo(() => {
    const s = startOfWeekMonday(viewDate);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    const fmt = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short" });
    return `${fmt.format(s)} — ${fmt.format(e)}`;
  }, [viewDate]);

  const monthCells = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    return buildMonthGrid(y, m);
  }, [viewDate]);

  const weekDays = useMemo(() => {
    const s = startOfWeekMonday(viewDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return {
        date: d,
        key: localDayKeyFromParts(d.getFullYear(), d.getMonth(), d.getDate()),
      };
    });
  }, [viewDate]);

  const selectedItems = selectedDayKey ? (byDay.get(selectedDayKey) ?? []) : [];
  /** Recalculated each paint so “today” stays correct après minuit sans recharger la page. */
  const todayKey = calendarTodayKey();

  const selectedDayLabel = useMemo(() => {
    if (!selectedDayKey) return null;
    const d = parseLocalDayKey(selectedDayKey);
    if (!d) return null;
    return new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "numeric", month: "long" }).format(d);
  }, [selectedDayKey]);

  const goToToday = useCallback(() => {
    const t = new Date();
    setViewDate(t);
    setSelectedDayKey(localDayKeyFromParts(t.getFullYear(), t.getMonth(), t.getDate()));
  }, []);

  const offlineAuth = !isConfigured || !firestore;

  const scheduleIvRow = useCallback((iv: Intervention) => {
    return (
      <li
        key={iv.id}
        data-testid={`calendar-slot-${iv.id}`}
        title={`Dossier ${iv.id}`}
        className="rounded-2xl border border-black/[0.05] bg-white/95 px-3 py-2.5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.12)]"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 leading-snug text-[14px] font-semibold tracking-tight text-slate-900">
            {interventionClientLabel(iv)}
          </p>
          <Badge variant="secondary" className="max-w-[6.5rem] shrink-0 truncate text-[10px] font-semibold">
            {statusLabelFr(iv.status)}
          </Badge>
        </div>
        <p className="mt-1.5 text-[12px] font-medium text-slate-500">{formatScheduledLabel(iv)}</p>
        <p className="sr-only">Dossier {iv.id}</p>
      </li>
    );
  }, []);

  if (!workspace || !workspace.isTenantUser || !workspace.memberships.length) {
    return (
      <div
        data-testid="calendar-integration-gate"
        style={outfit}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] px-4 py-6"
      >
        <div
          className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-[20px] border border-sky-200/40 bg-gradient-to-b from-sky-50/90 to-white/80 px-4 py-8 text-[13px] shadow-[0_14px_36px_-18px_rgba(15,23,42,0.12)]"
          aria-labelledby="calendar-gate-title"
        >
          <p id="calendar-gate-title" className="sr-only">
            Portail société requis pour afficher le planning.
          </p>
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-sky-500/12 text-sky-700">
            <Building2 className="h-7 w-7" aria-hidden />
          </div>
        </div>
      </div>
    );
  }

  const ws = workspace;

  return (
    <div
      data-testid="calendar-integration-panel"
      style={outfit}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
      aria-label="Planning des interventions"
    >
      <div className={cn(GLASS_PANEL_BODY_SCROLL_COMPACT, "flex min-h-0 flex-1 flex-col gap-4")}>
        <header className="flex shrink-0 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-slate-900 text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.45)]">
              <CalendarDays className="h-[22px] w-[22px]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-bold tracking-tight text-slate-900">Agenda</h2>
              <p className="sr-only">Vue calendrier des interventions planifiées</p>
            </div>
          </div>

          <div
            className="flex w-full rounded-[14px] bg-slate-200/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            role="tablist"
            aria-label="Type de vue"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "month"}
              data-testid="calendar-tab-month"
              onClick={() => setViewMode("month")}
              className={cn(
                "flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-[11px] text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                viewMode === "month"
                  ? "bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)]"
                  : "text-slate-600 hover:text-slate-800",
              )}
            >
              <CalendarDays className="h-4 w-4 opacity-80" aria-hidden />
              <span>Mois</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "week"}
              data-testid="calendar-tab-week"
              onClick={() => setViewMode("week")}
              className={cn(
                "flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-[11px] text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                viewMode === "week"
                  ? "bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)]"
                  : "text-slate-600 hover:text-slate-800",
              )}
            >
              <CalendarRange className="h-4 w-4 opacity-80" aria-hidden />
              <span>Semaine</span>
            </button>
          </div>

          <div className="relative">
            <Building2
              className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Label htmlFor="calendar-filter-company" className="sr-only">
              Société
            </Label>
            <select
              id="calendar-filter-company"
              data-testid="calendar-filter-company"
              className="h-11 w-full cursor-pointer appearance-none rounded-[14px] border border-black/[0.06] bg-white/95 py-2 pl-10 pr-3 text-[13px] font-semibold text-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
              value={companyFilterId}
              onChange={(e) => {
                const id = e.target.value;
                setCompanyFilterId(id);
                ws.setActiveCompanyId(id);
              }}
            >
              {ws.memberships.map((m) => (
                <option key={m.companyId} value={m.companyId}>
                  {m.companyName}
                </option>
              ))}
            </select>
          </div>
        </header>

        {offlineAuth ? (
          <div
            role="status"
            className="flex items-center gap-2.5 rounded-[14px] border border-amber-200/50 bg-amber-50/85 px-3.5 py-2.5 text-[12px] font-semibold text-amber-950"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
            <span>Connexion requise</span>
          </div>
        ) : null}

        {!offlineAuth && !auth?.currentUser ? (
          <p className="text-[12px] font-medium text-slate-600">Connectez-vous.</p>
        ) : null}

        {error ? (
          <p className="rounded-[16px] border border-rose-200/60 bg-rose-50/90 px-3 py-3 text-[13px] font-medium text-rose-900">
            {error}
          </p>
        ) : null}

        <div className="flex shrink-0 items-stretch gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="calendar-prev"
            className="h-11 w-11 shrink-0 rounded-[13px] border-black/[0.08] p-0 shadow-sm"
            onClick={navigate.prev}
            aria-label="Période précédente"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col justify-center rounded-[13px] border border-black/[0.06] bg-white/90 px-2 py-1.5 text-center shadow-[0_2px_16px_-8px_rgba(15,23,42,0.12)]">
            <p className="truncate text-[14px] font-bold leading-tight text-slate-900" data-testid="calendar-range-title">
              {viewMode === "month" ? monthTitle : weekTitle}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="calendar-next"
            className="h-11 w-11 shrink-0 rounded-[13px] border-black/[0.08] p-0 shadow-sm"
            onClick={navigate.next}
            aria-label="Période suivante"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <div className="flex shrink-0 justify-center">
          <button
            type="button"
            data-testid="calendar-go-today"
            onClick={goToToday}
            className="rounded-full border border-black/[0.06] bg-white/95 px-4 py-2 text-[12px] font-bold text-sky-700 shadow-sm transition hover:bg-sky-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
          >
            Aujourd&apos;hui
          </button>
        </div>

        {loading && tenantReady ? (
          <div data-testid="calendar-loading" className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/50" aria-hidden />
            ))}
          </div>
        ) : null}

        {!loading && tenantReady && viewMode === "month" ? (
          <div
            data-testid="calendar-month-grid"
            className="overflow-hidden rounded-[22px] border border-black/[0.05] bg-white/92 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)]"
          >
            <div className="grid grid-cols-7 gap-0 border-b border-slate-100/90 bg-slate-50/60 px-1 pt-2">
              {WEEKDAY_FR.map((w) => (
                <div key={w} className="py-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 p-1.5">
              {monthCells.map((cell, idx) => {
                if (cell === null) {
                  return <div key={`empty-${idx}`} className="min-h-[64px]" aria-hidden />;
                }
                const y = viewDate.getFullYear();
                const m = viewDate.getMonth();
                const key = localDayKeyFromParts(y, m, cell);
                const count = byDay.get(key)?.length ?? 0;
                const pressed = selectedDayKey === key;
                const isTodayCell = key === todayKey;

                return (
                  <button
                    key={key}
                    type="button"
                    data-testid={`calendar-month-cell-${key}`}
                    onClick={() => setSelectedDayKey(key)}
                    aria-pressed={pressed}
                    aria-label={
                      count === 0
                        ? `Le ${cell}, aucune intervention`
                        : `Le ${cell}, ${count} intervention${count > 1 ? "s" : ""}`
                    }
                    className={cn(
                      "relative flex min-h-[64px] flex-col items-center gap-1 rounded-[15px] border border-transparent px-0.5 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                      pressed ? "border-slate-900/14 bg-slate-900/[0.05]" : "hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold tabular-nums",
                        pressed
                          ? "bg-slate-900 text-white shadow-[0_4px_12px_-4px_rgba(15,23,42,0.45)]"
                          : isTodayCell
                            ? "text-sky-600 shadow-[inset_0_0_0_1.5px_rgba(56,189,248,0.55)]"
                            : "text-slate-800",
                      )}
                    >
                      {cell}
                    </span>
                    {count > 0 ? (
                      <span className="min-h-[14px] text-[11px] font-bold tabular-nums text-slate-900">{count}</span>
                    ) : (
                      <span className="min-h-[14px]" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {!loading && tenantReady && viewMode === "week" ? (
          <div data-testid="calendar-week-grid" className="-mx-0.5">
            <p className="sr-only">Semaine : cartes jour en défilement horizontal.</p>
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
              {weekDays.map(({ date, key }) => {
                const items = byDay.get(key) ?? [];
                const pressed = selectedDayKey === key;
                const isTodayCol = key === todayKey;

                return (
                  <div
                    key={key}
                    data-testid={`calendar-week-column-${key}`}
                      className={cn(
                        "flex min-w-[12rem] max-w-[16rem] shrink-0 snap-center flex-col rounded-[20px] border bg-white/95 p-3 shadow-[0_10px_36px_-20px_rgba(15,23,42,0.2)]",
                      pressed ? "border-slate-900 border-opacity-95 ring-2 ring-slate-900/12" : "border-black/[0.05]",
                    )}
                  >
                    <button
                      type="button"
                      className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 rounded-[14px] text-left outline-none transition hover:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-slate-900/18"
                      onClick={() => setSelectedDayKey(key)}
                      aria-pressed={pressed}
                      data-testid={`calendar-week-head-${key}`}
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="text-[28px] font-bold tabular-nums leading-none tracking-tight text-slate-900">
                          {date.getDate()}
                        </span>
                        <span className="text-[12px] font-semibold capitalize text-slate-500">
                          {new Intl.DateTimeFormat("fr-BE", { weekday: "short" }).format(date)}
                        </span>
                      </span>
                      {isTodayCol ? (
                        <span className="rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                          Auj.
                        </span>
                      ) : null}
                    </button>

                    <div className="min-h-[120px] flex-1">
                      {items.length > 0 ? (
                        <ul className="flex flex-col gap-2">{items.map(scheduleIvRow)}</ul>
                      ) : (
                        <div className="flex h-full min-h-[100px] flex-col items-center justify-center rounded-xl bg-slate-50/80 px-2 text-center">
                          <CalendarDays className="mb-1 h-8 w-8 text-slate-200" aria-hidden />
                          <p className="text-[11px] font-semibold leading-snug text-slate-400">Libre</p>
                          <p className="sr-only">Aucune intervention ce jour.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {!loading && tenantReady && viewMode === "month" ? (
          <section
            data-testid="calendar-day-detail"
            className="overflow-hidden rounded-[20px] border border-black/[0.05] bg-gradient-to-b from-white to-slate-50/40 p-4 shadow-[0_8px_32px_-18px_rgba(15,23,42,0.15)]"
            aria-labelledby="calendar-day-detail-heading"
          >
            <div className="mb-4 flex flex-col gap-0.5 border-b border-black/[0.06] pb-3">
              <h3 id="calendar-day-detail-heading" className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Journée
              </h3>
              {selectedDayLabel ? (
                <p className="text-[17px] font-bold capitalize leading-snug tracking-tight text-slate-900">{selectedDayLabel}</p>
              ) : (
                <p className="text-[15px] font-semibold text-slate-500">Choisir un jour</p>
              )}
              {selectedDayKey ? (
                <p className="text-[12px] font-semibold text-slate-500" data-testid="calendar-day-detail-count">
                  {selectedItems.length === 0
                    ? "Aucune intervention"
                    : `${selectedItems.length} intervention${selectedItems.length > 1 ? "s" : ""}`}
                </p>
              ) : null}
            </div>

            <p className="sr-only">
              Détail du jour
              {selectedDayKey ? ` ${selectedDayKey}` : ""}
            </p>
            {selectedDayKey && selectedItems.length > 0 ? (
              <ul className="flex flex-col gap-3">{selectedItems.map(scheduleIvRow)}</ul>
            ) : selectedDayKey ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarDays className="h-10 w-10 text-slate-200/90" aria-hidden />
                <p className="mt-3 text-[13px] font-medium text-slate-500">Libre ce jour-ci.</p>
                <p className="sr-only">Jour sans intervention planifiée.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarDays className="h-10 w-10 text-slate-200/90" aria-hidden />
                <p className="mt-3 text-[13px] font-medium text-slate-500">Touchez un jour dans la grille ci-dessus.</p>
                <p className="sr-only">Sélectionner un jour dans le calendrier.</p>
              </div>
            )}
          </section>
        ) : null}

        <p className="sr-only">
          {scheduledOnly.length} intervention(s) planifiée(s) pour la société active
        </p>
      </div>
    </div>
  );
}
