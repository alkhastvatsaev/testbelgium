"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  ArrowLeft,
  Trash2,
  UserPlus,
  CheckCircle2,
  Clock,
  FileCheck,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { firestore, auth } from "@/core/config/firebase";

import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { cn } from "@/lib/utils";
import { useBackOfficeInterventions } from "@/features/backoffice/useBackOfficeInterventions";
import { useResolvedInterventionAudio } from "@/features/backoffice/useResolvedInterventionAudio";
import type { Intervention } from "@/features/interventions/types";
import { getDefaultAssignedTechnicianUid } from "@/features/interventions/defaultAssignedTechnicianUid";
import { capitalizeName, formatAddress } from "@/utils/stringUtils";
import { guessGenderPrefixFromName } from "@/utils/genderDetection";
import IvanaClientChatPanel from "@/features/backoffice/components/IvanaClientChatPanel";
import { IVANA_PORTAL_MESSAGE_EVENT } from "@/features/backoffice/ivanaChatPortalBridge";
import RequestDetailAudioPlayer from "@/features/backoffice/components/RequestDetailAudioPlayer";
import { useTechnicianBackofficeReportBridgeOptional } from "@/context/TechnicianBackofficeReportBridgeContext";
import {
  mergeReportCompletionMedia,
  pickLatestBridgedReportForIntervention,
  shouldDismissBridgedTerrainReport,
} from "@/features/backoffice/mergeReportCompletionMedia";
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";
import { PRESENTATION_PRIVACY_MODE } from "@/core/config/presentationMode";
import {
  coerceFirestoreLikeDate,
  scheduledFieldsWhenReleasingToTechnician,
} from "@/features/interventions/technicianSchedule";
import { useTranslation } from "@/core/i18n/I18nContext";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import { useTechnicianCaseIntent } from "@/context/TechnicianCaseIntentContext";
import {
  navigateTechnicianHub,
  TECHNICIAN_HUB_ANCHOR_MISSIONS,
} from "@/features/interventions/technicianHubNavigation";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

function formatBackofficeRowTime(value: unknown): string {
  const d = coerceFirestoreLikeDate(value);
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function readTranscription(inv: unknown): string | null {
  if (!inv || typeof inv !== "object") return null;
  const anyInv = inv as Record<string, unknown>;
  const candidates = [
    anyInv.transcription,
    anyInv.audioTranscription,
    anyInv.audio_transcription,
  ];
  const hit = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return typeof hit === "string" ? hit : null;
}

type InboxInterventionRowVariant = "request" | "report-active" | "report-archived";

function BackOfficeInboxInterventionRow({
  item,
  index,
  variant,
  onSelect,
}: {
  item: Intervention;
  index: number;
  variant: InboxInterventionRowVariant;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const isRequest = variant === "request";
  const isUrgent = item.urgency;

  let fName = item.clientFirstName;
  let lName = item.clientLastName;
  if (!fName && !lName && item.clientName) {
    const parts = item.clientName.trim().split(" ");
    fName = parts[0];
    lName = parts.slice(1).join(" ");
  }
  const prefix = fName ? guessGenderPrefixFromName(fName) : "";
  const displayLName = capitalizeName(lName || fName || "");
  const clientName = `${prefix} ${displayLName}`.trim() || t("backoffice.inbox.anonymous_client");

  return (
    <motion.div
      data-testid={variant === "report-archived" ? "backoffice-report-archived-row" : undefined}
      onClick={() => onSelect(item.id)}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[24px] border bg-white p-4 transition-all duration-300 hover:shadow-lg",
        isRequest
          ? isUrgent
            ? "border-amber-200 bg-amber-50/30"
            : "border-slate-100"
          : variant === "report-archived"
            ? "border-slate-200/70 bg-slate-50/50 opacity-85"
            : item.status === "invoiced"
              ? "border-green-100 opacity-70"
              : "border-blue-100",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isRequest ? (
              <span
                className={cn(
                  "flex h-2 w-2 rounded-full",
                  isUrgent ? "bg-amber-500 animate-pulse" : "bg-blue-500",
                )}
              />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            <h4 className="text-[15px] font-bold text-slate-800 truncate">{clientName}</h4>
          </div>
          <p className="text-[13px] text-slate-500 truncate mb-2">
            {item.problem || item.title || t("backoffice.inbox.no_description")}
          </p>
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isRequest
                ? item.createdAt
                  ? formatBackofficeRowTime(item.createdAt)
                  : "Maintenant"
                : item.completedAt
                  ? formatBackofficeRowTime(item.completedAt)
                  : ""}
            </span>
            <span className="truncate max-w-[120px]">{(item.address ?? "").split(",")[0]?.trim() || "—"}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight",
              isRequest
                ? isUrgent
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
                : item.status === "invoiced"
                  ? "bg-slate-100 text-slate-500"
                  : "bg-green-100 text-green-700",
            )}
          >
            {isRequest
              ? isUrgent
                ? t("backoffice.inbox.tag_urgent")
                : t("backoffice.inbox.tag_request")
              : item.status === "invoiced"
                ? t("backoffice.inbox.tag_verified")
                : t("backoffice.inbox.tag_report")}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

export default function BackOfficeInboxPanel() {
  const { t } = useTranslation();
  const workspace = useCompanyWorkspaceOptional();
  const cid = workspace?.isTenantUser ? workspace.activeCompanyId : null;
  const { interventions, loading } = useBackOfficeInterventions(cid);
  const terrainBridge = useTechnicianBackofficeReportBridgeOptional();
  const bridgedTerrainReports = terrainBridge?.reports ?? [];
  const pager = useDashboardPagerOptional();
  const { setPendingCaseId } = useTechnicianCaseIntent();

  const [activeTab, setActiveTab] = useState<"chat" | "requests" | "reports">("chat");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = useMemo(
    () => (selectedItemId ? interventions.find((x) => x.id === selectedItemId) ?? null : null),
    [interventions, selectedItemId],
  );

  const selectedReportCompletion = useMemo(() => {
    if (!selectedItem) return { photoUrls: [] as string[], signatureUrl: null as string | null };
    if (selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") {
      return { photoUrls: [], signatureUrl: null };
    }
    const bridged = pickLatestBridgedReportForIntervention(bridgedTerrainReports, selectedItem.id);
    return mergeReportCompletionMedia(selectedItem, bridged);
  }, [selectedItem, bridgedTerrainReports]);
  const [selectedTerrainLocalId, setSelectedTerrainLocalId] = useState<string | null>(null);
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  
  const [reportsArchiveExpanded, setReportsArchiveExpanded] = useState(false);

  const envDefaultCompanyId = useMemo(
    () =>
      typeof process.env.NEXT_PUBLIC_CLIENT_PORTAL_DEFAULT_COMPANY_ID === "string"
        ? process.env.NEXT_PUBLIC_CLIENT_PORTAL_DEFAULT_COMPANY_ID.trim()
        : "",
    [],
  );
  
  const ivanaChatCompanyId = (cid ?? envDefaultCompanyId) || null;

  const terrainIv = useMemo(() => {
    if (!selectedTerrainLocalId) return null;
    const r = bridgedTerrainReports.find((x) => x.localId === selectedTerrainLocalId);
    if (!r) return null;
    return interventions.find((x) => x.id === r.interventionId) ?? null;
  }, [selectedTerrainLocalId, bridgedTerrainReports, interventions]);

  const { resolvedAudioUrl, isResolvingAudio, audioStorageResolveFailed } =
    useResolvedInterventionAudio(selectedItem);
  const {
    resolvedAudioUrl: terrainResolvedAudioUrl,
    isResolvingAudio: terrainAudioLoading,
    audioStorageResolveFailed: terrainAudioFailed,
  } = useResolvedInterventionAudio(selectedTerrainLocalId ? terrainIv : null);


  const pendingRequests = useMemo(() => 
    interventions
      .filter((inv) => inv.status === "pending" || inv.status === "pending_needs_address")
      .sort((a, b) => {
        const timeA = coerceFirestoreLikeDate(a.createdAt)?.getTime() ?? 0;
        const timeB = coerceFirestoreLikeDate(b.createdAt)?.getTime() ?? 0;
        return timeB - timeA;
      }),
    [interventions]
  );

  const validationReports = useMemo(() => 
    interventions
      .filter((inv) => inv.status === "done" || inv.status === "invoiced")
      .sort((a, b) => {
        const timeA = coerceFirestoreLikeDate(a.completedAt)?.getTime() ?? 0;
        const timeB = coerceFirestoreLikeDate(b.completedAt)?.getTime() ?? 0;
        return timeB - timeA;
      }),
    [interventions]
  );

  
  const reportsToValidateList = useMemo(
    () => validationReports.filter((iv) => iv.status === "done"),
    [validationReports],
  );

  
  const reportsArchivedList = useMemo(
    () => validationReports.filter((iv) => iv.status === "invoiced"),
    [validationReports],
  );

  
  const bridgedTerrainVisible = useMemo(() => {
    const syncedIds = new Set(reportsToValidateList.map((iv) => iv.id));
    return bridgedTerrainReports.filter((r) => !syncedIds.has(r.interventionId));
  }, [bridgedTerrainReports, reportsToValidateList]);

  const bridgedTerrainCount = bridgedTerrainVisible.length;

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "interventions", id));
      toast.success(t("backoffice.toasts.request_deleted"));
      setSelectedItemId(null);
    } catch (e) {
      toast.error(t("common.error"), { description: t("backoffice.toasts.delete_failed") });
    }
  };

  const handleAssign = async (id: string) => {
    if (!firestore) return;
    try {
      const row = interventions.find((x) => x.id === id);
      const schedule = scheduledFieldsWhenReleasingToTechnician(row ?? {}, new Date());
      const targetUid = auth?.currentUser?.uid || getDefaultAssignedTechnicianUid();
      await updateDoc(doc(firestore, "interventions", id), {
        status: "in_progress",
        assignedTechnicianUid: targetUid,
        scheduledDate: schedule.scheduledDate,
        scheduledTime: schedule.scheduledTime,
      });
      toast.success(t("backoffice.toasts.request_assigned"));
      setSelectedItemId(null);
      setPendingCaseId(id);
      navigateTechnicianHub(pager, TECHNICIAN_HUB_ANCHOR_MISSIONS);
    } catch (e) {
      toast.error(t("common.error"), { description: t("backoffice.toasts.assign_failed") });
    }
  };

  const handleVerify = async (id: string) => {
    if (!firestore) {
      toast.error(t("common.error"), { description: t("backoffice.toasts.firestore_unavailable") });
      return;
    }
    try {
      await updateDoc(doc(firestore, "interventions", id), {
        status: "invoiced",
      });
      toast.success(t("backoffice.toasts.report_verified"));
      setSelectedItemId(null);
      if (terrainBridge) {
        const lids = terrainBridge.reports.filter((r) => r.interventionId === id).map((r) => r.localId);
        lids.forEach((lid) => terrainBridge.dismissReport(lid));
      }
      setSelectedTerrainLocalId(null);
    } catch (e) {
      console.error("Validation rapport:", e);
      const code =
        typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
      toast.error(t("common.error"), {
        description:
          code === "permission-denied"
            ? t("backoffice.toasts.permission_denied_verify")
            : e instanceof Error
              ? e.message
              : t("common.try_again"),
      });
    }
  };

  const handleUpdateDateTime = async () => {
    if (!selectedItem || !firestore) return;
    try {
      await updateDoc(doc(firestore, "interventions", selectedItem.id), {
        requestedDate: editDate,
        requestedTime: editTime,
      });
      toast.success(t("backoffice.toasts.datetime_updated"));
      setIsEditingDateTime(false);
    } catch (error) {
      toast.error(t("common.error"), { description: t("backoffice.toasts.update_failed") });
    }
  };

  const isTenant = !!workspace?.isTenantUser;

  useEffect(() => {
    if (activeTab !== "reports") setReportsArchiveExpanded(false);
  }, [activeTab]);

  useEffect(() => {
    if (!terrainBridge) return;

    bridgedTerrainReports.forEach((r) => {
      const iv = interventions.find((x) => x.id === r.interventionId);
      if (shouldDismissBridgedTerrainReport(iv)) {
        terrainBridge.dismissReport(r.localId);
      }
    });
  }, [bridgedTerrainReports, interventions, terrainBridge]);

  useEffect(() => {
    if (!isTenant) return;
    const openChat = () => setActiveTab("chat");
    window.addEventListener(IVANA_PORTAL_MESSAGE_EVENT, openChat);
    return () => window.removeEventListener(IVANA_PORTAL_MESSAGE_EVENT, openChat);
  }, [isTenant]);

  const itemsToShow = activeTab === "requests" ? pendingRequests : reportsToValidateList;

  const reportsTabBadgeCount = reportsToValidateList.length + bridgedTerrainCount;
  const reportsNothingAtAll =
    reportsToValidateList.length === 0 && bridgedTerrainCount === 0 && reportsArchivedList.length === 0;

  if (!isTenant) {
    return (
      <div
        data-testid="backoffice-inbox-panel"
        style={outfit}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-slate-50/30"
      >
        <IvanaClientChatPanel
          className="min-h-0"
          acceptPortalMessages
          chatCompanyId={ivanaChatCompanyId}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="backoffice-inbox-panel"
      style={outfit}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-slate-50/30"
    >
      {/* Tab Switcher */}
      <div className="flex p-1.5 gap-1 bg-slate-200/50 rounded-[20px] mx-4 my-4 border border-slate-300/30">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[16px] text-[12px] font-bold transition-all",
            activeTab === "requests"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-300/30",
          )}
        >
          {t("backoffice.inbox.tabs.requests")}
          {pendingRequests.length > 0 && (
            <span className="flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-blue-100 text-[9px] text-blue-600 border border-blue-200">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[16px] text-[12px] font-bold transition-all",
            activeTab === "reports"
              ? "bg-white text-green-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-300/30",
          )}
        >
          {t("backoffice.inbox.tabs.reports")}
          {reportsTabBadgeCount > 0 && (
            <span className="flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-green-100 text-[9px] text-green-600 border border-green-200">
              {reportsTabBadgeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[16px] text-[12px] font-bold transition-all",
            activeTab === "chat"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-300/30",
          )}
        >
          {t("backoffice.inbox.tabs.chat")}
        </button>
      </div>

      {}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          activeTab !== "chat" && "hidden",
        )}
        aria-hidden={activeTab !== "chat"}
      >
        <IvanaClientChatPanel
          className="min-h-0 flex-1 px-0"
          acceptPortalMessages
          chatCompanyId={ivanaChatCompanyId}
          onRemoteClientMessage={ivanaChatCompanyId ? () => setActiveTab("chat") : undefined}
        />
      </div>
      <div
        className={cn(
          GLASS_PANEL_BODY_SCROLL_COMPACT,
          "flex min-h-0 flex-1 flex-col gap-3 px-4 pb-6",
          activeTab === "chat" && "hidden",
        )}
        aria-hidden={activeTab === "chat"}
      >
        {activeTab === "reports" &&
          bridgedTerrainVisible.map((r) => (
            (() => {
              const iv = interventions.find((x) => x.id === r.interventionId);
              const first = iv?.clientFirstName ?? "";
              const last = iv?.clientLastName ?? "";
              const fallbackName = iv?.clientName ?? "";
              const nameRaw = `${first} ${last}`.trim() || fallbackName;
              const displayName = nameRaw ? capitalizeName(nameRaw) : `Client · …${r.interventionId.slice(-8)}`;
              const description =
                iv?.problem ||
                iv?.title ||
                `${String(t("backoffice.inbox.terrain_report"))} (${String(t("backoffice.inbox.photos"))} + ${String(t("backoffice.inbox.signature_client"))})`;
              const addressShort = (iv?.address ?? "").split(",")[0] || (iv?.address ? iv.address : "");
              const time = new Date(r.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <motion.div
                  key={r.localId}
                  data-testid="backoffice-bridged-report"
                  onClick={() => setSelectedTerrainLocalId(r.localId)}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-[24px] border bg-white p-4 transition-all duration-300 hover:shadow-lg",
                    "border-emerald-100 bg-emerald-50/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-[15px] font-bold text-slate-800 truncate">{displayName}</h4>
                      </div>
                      <p className="text-[13px] font-bold text-slate-700 truncate mb-2">{description}</p>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                        {addressShort ? (
                          <span className="truncate max-w-[140px]">{addressShort}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight bg-emerald-100 text-emerald-700">
                        {String(t("backoffice.inbox.tag_report"))}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </div>
                </motion.div>
              );
            })()
          ))}

        {loading ? (
          <div className="space-y-3 py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[24px] bg-white/50 border border-slate-200/50" />
            ))}
          </div>
        ) : null}

        {!loading &&
        ((activeTab === "requests" && pendingRequests.length === 0) ||
          (activeTab === "reports" && reportsNothingAtAll)) ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              {activeTab === "requests" ? (
                <ClipboardList className="h-8 w-8 text-slate-300" />
              ) : (
                <FileCheck className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium">
              {activeTab === "requests"
                ? t("backoffice.inbox.empty_requests")
                : t("backoffice.inbox.empty_reports")}
            </p>
          </div>
        ) : null}

        {!loading && itemsToShow.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {itemsToShow.map((item, index) => (
              <BackOfficeInboxInterventionRow
                key={item.id}
                item={item}
                index={index}
                variant={activeTab === "requests" ? "request" : "report-active"}
                onSelect={setSelectedItemId}
              />
            ))}
          </div>
        ) : null}

        {!loading && activeTab === "reports" && reportsArchivedList.length > 0 ? (
          <div className="mt-1 shrink-0 border-t border-slate-200/50 pt-1" data-testid="backoffice-reports-archive-section">
            <button
              type="button"
              data-testid="backoffice-reports-archive-toggle"
              aria-expanded={reportsArchiveExpanded}
              onClick={() => setReportsArchiveExpanded((v) => !v)}
              className="flex w-full items-center justify-center gap-1 rounded-[10px] py-2 px-2 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100/70 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60"
            >
              <ChevronDown
                className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200", reportsArchiveExpanded && "rotate-180")}
                aria-hidden
              />
              <span>
                Archive · {reportsArchivedList.length} validé{reportsArchivedList.length > 1 ? "s" : ""}
              </span>
            </button>
            {reportsArchiveExpanded ? (
              <div className="grid grid-cols-1 gap-3 pt-2" data-testid="backoffice-reports-archive-list">
                {reportsArchivedList.map((item, index) => (
                  <BackOfficeInboxInterventionRow
                    key={item.id}
                    item={item}
                    index={index}
                    variant="report-archived"
                    onSelect={setSelectedItemId}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-30 flex flex-col bg-white rounded-[inherit] shadow-2xl"
          >
            {/* Detail Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <button 
                onClick={() => {
                  setSelectedItemId(null);
                  setIsEditingDateTime(false);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-[15px] font-bold text-slate-800">
                {selectedItem.status === "pending" || selectedItem.status === "pending_needs_address"
                  ? t("backoffice.inbox.detail_title_request")
                  : t("backoffice.inbox.detail_title_report")}
              </h3>
              <div className="w-9" />
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Header Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <span className={cn(
                     "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                     (selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                   )}>
                     {selectedItem.status === "pending" || selectedItem.status === "pending_needs_address"
                       ? t("backoffice.inbox.kind_request")
                       : t("backoffice.inbox.kind_report")}{" "}
                     • ID: {selectedItem.id.slice(-6).toUpperCase()}
                   </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  {capitalizeName(
                    selectedItem.clientLastName ||
                      selectedItem.clientName ||
                      t("backoffice.inbox.anonymous_client"),
                  )}
                </h2>
                <p className="text-[15px] font-medium text-slate-500 mt-1">
                  {selectedItem.clientPhone || t("backoffice.inbox.no_phone")}
                </p>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {t("backoffice.inbox.location")}
                </span>
                <p className="text-[15px] font-semibold text-slate-800">{formatAddress(selectedItem.address)}</p>
              </div>

              {/* Problem / Report Description */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedItem.status === "pending" || selectedItem.status === "pending_needs_address"
                    ? t("backoffice.inbox.problem_label")
                    : t("backoffice.inbox.report_label")}
                </span>
                <div className="rounded-[20px] bg-slate-50 p-4 border border-slate-100">
                  <p className="text-[15px] text-slate-800 leading-relaxed">
                    {selectedItem.problem || t("backoffice.inbox.no_description_provided")}
                  </p>
                </div>
              </div>

              {/* Date & Time management for requests */}
              {(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") && (
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      {t("backoffice.inbox.requested_schedule")}
                    </span>
                    {!isEditingDateTime && (
                      <button 
                        onClick={() => {
                          setEditDate(selectedItem.requestedDate || "");
                          setEditTime(selectedItem.requestedTime || "");
                          setIsEditingDateTime(true);
                        }}
                        className="text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        {t("backoffice.inbox.edit").toUpperCase()}
                      </button>
                    )}
                  </div>
                  
                  {isEditingDateTime ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="rounded-[12px] border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input 
                        type="time" 
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="rounded-[12px] border border-slate-200 px-3 py-2 text-sm"
                      />
                      <div className="col-span-2 flex justify-end gap-2 mt-1">
                        <button onClick={() => setIsEditingDateTime(false)} className="text-xs px-3 py-1.5 rounded-[8px] bg-slate-100">
                          {t("common.cancel")}
                        </button>
                        <button onClick={handleUpdateDateTime} className="text-xs px-3 py-1.5 rounded-[8px] bg-slate-900 text-white">
                          {t("common.save")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-900 font-bold">
                      <Clock className="w-4 h-4" />
                      {selectedItem.requestedDate 
                        ? `${selectedItem.requestedDate} ${selectedItem.requestedTime ? `à ${selectedItem.requestedTime}` : ""}`
                        : t("backoffice.inbox.asap")}
                    </div>
                  )}
                </div>
              )}

              {/* Photos Grid */}
              {(((selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") && selectedItem.attachmentThumbnails) ||
                (!(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") &&
                  selectedReportCompletion.photoUrls.length > 0)) && (
                <div className="space-y-3" data-testid="backoffice-report-detail-photos-section">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {selectedItem.status === "pending" || selectedItem.status === "pending_needs_address"
                      ? t("backoffice.inbox.photos_client")
                      : t("backoffice.inbox.photos_completion")}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      (selectedItem.status === "pending" || selectedItem.status === "pending_needs_address")
                        ? selectedItem.attachmentThumbnails
                        : selectedReportCompletion.photoUrls
                    )?.map((url, i) => (
                      <div key={i} className="aspect-square relative rounded-[20px] overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Intervention"
                          className={cn(
                            "w-full h-full object-cover",
                            (selectedItem.status !== "pending" && selectedItem.status !== "pending_needs_address") &&
                              (PRESENTATION_PRIVACY_MODE || devUiPreviewEnabled) &&
                              "blur-lg",
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio / Transcription for requests (under photos) */}
              {(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") ? (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {t("backoffice.inbox.voice_message")}
                  </span>
                  {resolvedAudioUrl ? (
                    <RequestDetailAudioPlayer
                      key={`${selectedItem.id}-${resolvedAudioUrl}`}
                      url={resolvedAudioUrl}
                    />
                  ) : isResolvingAudio ? (
                    <div
                      data-testid="backoffice-request-detail-audio-loading"
                      className="flex w-full items-center gap-3 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4"
                      aria-busy="true"
                      aria-label={t("backoffice.inbox.voice_loading")}
                    >
                      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200" aria-hidden />
                      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                        <div className="h-2 w-full animate-pulse rounded-full bg-slate-200" />
                        <div className="flex justify-between gap-2">
                          <div className="h-2 w-10 animate-pulse rounded bg-slate-200" />
                          <div className="h-2 w-10 animate-pulse rounded bg-slate-200" />
                        </div>
                      </div>
                      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200/80" aria-hidden />
                    </div>
                  ) : audioStorageResolveFailed ? (
                    <div
                      data-testid="backoffice-request-detail-audio-storage-error"
                      className="w-full rounded-[20px] border border-amber-200/90 bg-amber-50/80 px-4 py-4 text-center text-[13px] font-semibold leading-snug text-amber-950"
                    >
                      {t("backoffice.inbox.voice_storage_error")}
                    </div>
                  ) : (
                    <div
                      data-testid="backoffice-request-detail-audio-empty"
                      className="w-full rounded-[20px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-center text-[13px] font-semibold text-slate-500"
                    >
                      {t("backoffice.inbox.voice_empty")}
                    </div>
                  )}
                  {readTranscription(selectedItem) ? (
                    <div className="rounded-[20px] border border-blue-100 bg-blue-50/50 p-4 text-sm italic text-blue-900">
                      "{readTranscription(selectedItem)}"
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Signature for reports */}
              {!(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") &&
                selectedReportCompletion.signatureUrl && (
                  <div className="space-y-3" data-testid="backoffice-report-detail-signature-section">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      {t("backoffice.inbox.signature_client")}
                    </span>
                    <div className="rounded-[20px] bg-slate-50 p-4 border border-slate-100 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedReportCompletion.signatureUrl}
                        alt={t("backoffice.inbox.signature_alt")}
                        className="max-h-32 object-contain"
                      />
                    </div>
                  </div>
                )}
            </div>

            {/* Sticky Actions */}
            <div className="p-6 border-t border-slate-100 bg-white/80 backdrop-blur-md flex gap-3">
              {(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") ? (
                <>
                  <button
                    onClick={() => handleDelete(selectedItem.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-[20px] border border-red-100 bg-red-50 text-red-600 font-bold text-[14px] hover:bg-red-100 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("common.delete")}
                  </button>
                  <button
                    onClick={() => handleAssign(selectedItem.id)}
                    className="flex-[1.5] flex items-center justify-center gap-2 py-4 px-4 rounded-[20px] bg-blue-600 text-white font-bold text-[14px] shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    {t("backoffice.inbox.confirm_assign")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleDelete(selectedItem.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-[20px] border border-red-100 bg-red-50 text-red-600 font-bold text-[14px] hover:bg-red-100 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("common.delete")}
                  </button>
                  <button
                    disabled={selectedItem.status === "invoiced"}
                    onClick={() => handleVerify(selectedItem.id)}
                    className={cn(
                      "flex-[1.5] flex items-center justify-center gap-2 py-4 px-4 rounded-[20px] font-bold text-[14px] transition-all",
                      selectedItem.status === "invoiced"
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-green-600 text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)] hover:bg-green-700 active:scale-95"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedItem.status === "invoiced"
                      ? t("backoffice.inbox.report_already_verified")
                      : t("backoffice.inbox.verify_report")}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTerrainLocalId ? (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-30 flex flex-col bg-white rounded-[inherit] shadow-2xl"
          >
            {(() => {
              const r = bridgedTerrainReports.find((x) => x.localId === selectedTerrainLocalId);
              if (!r) return null;
              const iv = interventions.find((x) => x.id === r.interventionId);
              const first = iv?.clientFirstName ?? "";
              const last = iv?.clientLastName ?? "";
              const fallbackName = iv?.clientName ?? "";
              const nameRaw = `${first} ${last}`.trim() || fallbackName;
              const displayName = nameRaw ? capitalizeName(nameRaw) : `Client · …${r.interventionId.slice(-8)}`;
              const phone = iv?.clientPhone ?? "";
              const address = iv?.address ? formatAddress(iv.address) : "";
              const description = iv?.problem || iv?.title || "";
              const isAlreadyValidated = iv?.status === "invoiced";

              return (
                <>
                  <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedTerrainLocalId(null)}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      aria-label={String(t("common.back"))}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-[15px] font-bold text-slate-800">{String(t("backoffice.inbox.terrain_report"))}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        terrainBridge?.dismissReport(r.localId);
                        setSelectedTerrainLocalId(null);
                      }}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      aria-label={t("backoffice.inbox.hide_report")}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="rounded-[20px] bg-slate-50 p-4 border border-slate-100 space-y-2">
                      <p className="text-[14px] !font-extrabold text-slate-900">{displayName}</p>
                      {phone ? <p className="text-[12px] !font-bold text-slate-700">{phone}</p> : null}
                      {address ? <p className="text-[12px] !font-bold text-slate-700">{address}</p> : null}
                      {description ? (
                        <p className="text-[13px] !font-bold text-slate-800 leading-relaxed">
                          {t("backoffice.inbox.problem_prefix")} · {description}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("backoffice.inbox.voice_message")}
                      </p>
                      {terrainResolvedAudioUrl ? (
                        <RequestDetailAudioPlayer
                          key={`terrain-${r.interventionId}-${terrainResolvedAudioUrl}`}
                          url={terrainResolvedAudioUrl}
                        />
                      ) : terrainAudioLoading ? (
                        <div
                          data-testid="backoffice-terrain-report-audio-loading"
                          className="flex w-full items-center gap-3 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4"
                          aria-busy="true"
                          aria-label={t("backoffice.inbox.voice_loading")}
                        >
                          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200" aria-hidden />
                          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                            <div className="h-2 w-full animate-pulse rounded-full bg-slate-200" />
                            <div className="flex justify-between gap-2">
                              <div className="h-2 w-10 animate-pulse rounded bg-slate-200" />
                              <div className="h-2 w-10 animate-pulse rounded bg-slate-200" />
                            </div>
                          </div>
                          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200/80" aria-hidden />
                        </div>
                      ) : terrainAudioFailed ? (
                        <div
                          data-testid="backoffice-terrain-report-audio-storage-error"
                          className="w-full rounded-[20px] border border-amber-200/90 bg-amber-50/80 px-4 py-4 text-center text-[13px] font-semibold leading-snug text-amber-950"
                        >
                          {t("backoffice.inbox.voice_storage_error")}
                        </div>
                      ) : (
                        <div
                          data-testid="backoffice-terrain-report-audio-empty"
                          className="w-full rounded-[20px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-center text-[13px] font-semibold text-slate-500"
                        >
                          {t("backoffice.inbox.voice_empty")}
                        </div>
                      )}
                      {iv && readTranscription(iv) ? (
                        <div className="rounded-[20px] border border-blue-100 bg-blue-50/50 p-4 text-sm italic text-blue-900">
                          "{readTranscription(iv)}"
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("backoffice.inbox.photos")}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {r.photoDataUrls.map((url, i) => (
                          <div
                            key={`${r.localId}-detail-ph-${i}`}
                            className="aspect-square relative rounded-[20px] overflow-hidden border border-slate-100 bg-slate-50 shadow-sm"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className={cn(
                                "w-full h-full object-cover",
                                (PRESENTATION_PRIVACY_MODE || devUiPreviewEnabled) ? "blur-lg" : null,
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("backoffice.inbox.signature_client")}
                      </p>
                      <div className="rounded-[20px] bg-slate-50 p-4 border border-slate-100 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.signaturePngDataUrl} alt={t("backoffice.inbox.signature_alt")} className="max-h-32 object-contain" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-white/80 backdrop-blur-md flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleDelete(r.interventionId);
                        terrainBridge?.dismissReport(r.localId);
                        setSelectedTerrainLocalId(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-[20px] border border-red-100 bg-red-50 text-red-600 font-bold text-[14px] hover:bg-red-100 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t("common.delete")}
                    </button>
                    <button
                      type="button"
                      data-testid={`backoffice-bridged-report-validate-${r.localId}`}
                      disabled={!iv || isAlreadyValidated}
                      onClick={() => void handleVerify(r.interventionId)}
                      className={cn(
                        "flex-[1.5] flex items-center justify-center gap-2 py-4 px-4 rounded-[20px] font-bold text-[14px] transition-all",
                        !iv
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : isAlreadyValidated
                            ? "bg-emerald-100 text-emerald-700 cursor-not-allowed opacity-70"
                            : "bg-emerald-600 text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)] hover:bg-emerald-700 active:scale-95",
                      )}
                      aria-label={t("backoffice.inbox.verify_terrain_report_aria")}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isAlreadyValidated ? t("backoffice.inbox.already_verified") : t("backoffice.inbox.verify_report")}
                    </button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
