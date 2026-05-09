"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { auth, isConfigured } from "@/core/config/firebase";
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";
import { useDashboardSelectedDate } from "@/context/DateContext";
import { useTechnicianAssignments } from "@/features/interventions/useTechnicianAssignments";
import type { Intervention } from "@/features/interventions/types";

import {
  interventionClientLabel,
  interventionMatchesTab,
  sortInterventionsByScheduleAsc,
  formatScheduledTimeOnly,
} from "@/features/interventions/technicianSchedule";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

import { cn } from "@/lib/utils";
import { capitalizeName } from "@/utils/stringUtils";
import { guessGenderPrefixFromName } from "@/utils/genderDetection";

function CaseCard({
  iv,
  index,
  isSelected,
  onOpen,
}: {
  iv: Intervention;
  index: number;
  isSelected: boolean;
  onOpen: () => void;
}) {
  let firstName = iv.clientFirstName;
  let lastName = iv.clientLastName;

  if (!firstName && iv.clientName) {
    const parts = iv.clientName.trim().split(' ');
    firstName = parts[0];
    if (!lastName && parts.length > 1) {
      lastName = parts.slice(1).join(' ');
    } else if (!lastName) {
      lastName = parts[0];
    }
  }

  lastName = lastName || iv.title || "Client";
  const formattedLastName = capitalizeName(lastName);

  const genderPrefix = guessGenderPrefixFromName(firstName);
  const displayLabel = genderPrefix ? `${genderPrefix} ${formattedLastName}` : formattedLastName;

  const timeLabel = formatScheduledTimeOnly(iv);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index - 1) * 0.05 }}
      type="button"
      data-testid={`technician-case-${iv.id}`}
      aria-label={`Dossier ${iv.id}, ${displayLabel}`}
      onClick={onOpen}
      className={`group relative grid w-full cursor-pointer grid-cols-[max-content_1fr_auto] items-center gap-3 rounded-[20px] px-4 py-4 text-left transition-all duration-300 active:scale-[0.99] ${
        isSelected
          ? "bg-blue-50 shadow-[0_14px_32px_-10px_rgba(59,130,246,0.35)] ring-1 ring-blue-200"
          : "bg-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)] hover:bg-slate-50 hover:shadow-[0_14px_32px_-10px_rgba(15,23,42,0.18)]"
      }`}
    >
      <div className="flex justify-start">
        <div className={`relative flex h-10 min-w-10 px-2 shrink-0 items-center justify-center rounded-[12px] text-[13px] font-bold tracking-wide transition-all duration-300 group-hover:scale-105 ${isSelected ? "bg-blue-100/80 text-blue-800" : "bg-slate-100/80 text-slate-700 group-hover:bg-slate-200/80"}`}>
          {timeLabel}
        </div>
      </div>
      
      <h3 className={`truncate text-center text-[14px] font-semibold ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
        {displayLabel}
      </h3>
      
      <div className="flex justify-end">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${isSelected ? "bg-blue-500 text-white shadow-md shadow-blue-500/25" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 shadow-sm"}`}>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </motion.button>
  );
}

export default function TechnicianDashboardListPanel({
  selectedCaseId,
  onSelect,
}: {
  selectedCaseId: string | null;
  onSelect: (id: string) => void;
}) {
  const { interventions, loading, error, firebaseUid } = useTechnicianAssignments();
  const dashboardSelectedDate = useDashboardSelectedDate();

  const tabAnchorDate = useMemo(() => {
    const previewAnonymous =
      devUiPreviewEnabled &&
      (!auth || !auth.currentUser || auth.currentUser.isAnonymous);
    return previewAnonymous ? dashboardSelectedDate : new Date();
  }, [dashboardSelectedDate]);

  const filteredSorted = useMemo(() => {
    const matched = interventions.filter((iv) => interventionMatchesTab(iv, "today", tabAnchorDate));
    return sortInterventionsByScheduleAsc(matched);
  }, [interventions, tabAnchorDate]);

  const offlineAuth = !isConfigured || !auth;

  return (
    <div
      data-testid="technician-dashboard-list"
      style={outfit}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
      aria-label="Missions assignées"
    >
      <div
        className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex min-h-0 flex-1 flex-col gap-3 px-1`}
      >
        <h2 className="sr-only">Missions</h2>

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

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {loading && firebaseUid ? (
            <div data-testid="technician-dashboard-loading" className="space-y-4 py-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[72px] animate-pulse rounded-[20px] bg-slate-200/55"
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
                Aucune mission assignée aujourd'hui.
              </p>
            </div>
          ) : null}

          {!loading && firebaseUid && filteredSorted.length > 0 ? (
            <ul className="flex min-h-0 flex-1 flex-col gap-3 pb-1" aria-label="Liste des interventions">
              {filteredSorted.map((iv, index) => (
                <li key={iv.id}>
                  <CaseCard
                    iv={iv}
                    index={index + 1}
                    isSelected={selectedCaseId === iv.id}
                    onOpen={() => onSelect(iv.id)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
