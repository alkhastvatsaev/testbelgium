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
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { firestore } from "@/core/config/firebase";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { storage } from "@/core/config/firebase";

import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { cn } from "@/lib/utils";
import { useBackOfficeInterventions } from "@/features/backoffice/useBackOfficeInterventions";
import type { Intervention } from "@/features/interventions/types";
import { DEMO_TECHNICIAN_UID } from "@/core/config/devUiPreview";
import { capitalizeName, formatAddress } from "@/utils/stringUtils";
import { guessGenderPrefixFromName } from "@/utils/genderDetection";
import IvanaClientChatPanel from "@/features/backoffice/components/IvanaClientChatPanel";
import { useTechnicianBackofficeReportBridgeOptional } from "@/context/TechnicianBackofficeReportBridgeContext";
import { PRESENTATION_PRIVACY_MODE } from "@/core/config/presentationMode";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

function readAudioUrl(inv: unknown): string | null {
  if (!inv || typeof inv !== "object") return null;
  const anyInv = inv as Record<string, unknown>;
  const candidates = [
    anyInv.audioUrl,
    anyInv.audioURL,
    anyInv.audio_url,
    anyInv.voiceUrl,
    anyInv.voice_url,
  ];
  const hit = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return typeof hit === "string" ? hit : null;
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

function readAudioStoragePath(inv: unknown): string | null {
  if (!inv || typeof inv !== "object") return null;
  const anyInv = inv as Record<string, unknown>;
  const candidates = [anyInv.audioStoragePath, anyInv.audio_storage_path, anyInv.voiceStoragePath];
  const hit = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return typeof hit === "string" ? hit : null;
}

export default function BackOfficeInboxPanel() {
  const workspace = useCompanyWorkspaceOptional();
  const cid = workspace?.isTenantUser ? workspace.activeCompanyId : null;
  const { interventions, loading } = useBackOfficeInterventions(cid);
  const terrainBridge = useTechnicianBackofficeReportBridgeOptional();
  const bridgedTerrainReports = terrainBridge?.reports ?? [];
  const bridgedTerrainCount = bridgedTerrainReports.length;

  const [activeTab, setActiveTab] = useState<"chat" | "requests" | "reports">("chat");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = useMemo(
    () => (selectedItemId ? interventions.find((x) => x.id === selectedItemId) ?? null : null),
    [interventions, selectedItemId],
  );
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);
  const [isResolvingAudio, setIsResolvingAudio] = useState(false);
  const [selectedTerrainLocalId, setSelectedTerrainLocalId] = useState<string | null>(null);
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  // Filters
  const pendingRequests = useMemo(() => 
    interventions
      .filter((inv) => inv.status === "pending" || inv.status === "pending_needs_address")
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }),
    [interventions]
  );

  const validationReports = useMemo(() => 
    interventions
      .filter((inv) => inv.status === "done" || inv.status === "invoiced")
      .sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt as string).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt as string).getTime() : 0;
        return timeB - timeA;
      }),
    [interventions]
  );

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "interventions", id));
      toast.success("Demande supprimée");
      setSelectedItemId(null);
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAssign = async (id: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "interventions", id), {
        status: "in_progress",
        assignedTechnicianUid: DEMO_TECHNICIAN_UID,
      });
      toast.success("Demande assignée à Mansour");
      setSelectedItemId(null);
    } catch (e) {
      toast.error("Erreur lors de l'assignation");
    }
  };

  const handleVerify = async (id: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "interventions", id), {
        status: "invoiced",
      });
      toast.success("Rapport validé");
      setSelectedItemId(null);
    } catch (e) {
      toast.error("Erreur lors de la validation");
    }
  };

  const handleUpdateDateTime = async () => {
    if (!selectedItem || !firestore) return;
    try {
      await updateDoc(doc(firestore, "interventions", selectedItem.id), {
        requestedDate: editDate,
        requestedTime: editTime,
      });
      toast.success("Horaire mis à jour");
      setIsEditingDateTime(false);
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const isTenant = !!workspace?.isTenantUser;

  useEffect(() => {
    setResolvedAudioUrl(null);
    setIsResolvingAudio(false);
    if (!selectedItem) return;
    const direct = readAudioUrl(selectedItem);
    if (direct) {
      setResolvedAudioUrl(direct);
      return;
    }
    const path = readAudioStoragePath(selectedItem);
    if (!path || !storage) return;
    let cancelled = false;
    setIsResolvingAudio(true);
    void getDownloadURL(storageRef(storage, path))
      .then((url) => {
        if (!cancelled) setResolvedAudioUrl(url);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
      setIsResolvingAudio(false);
    };
  }, [selectedItem]);

  useEffect(() => {
    if (!terrainBridge) return;
    // Auto-dismiss bridged reports once the intervention is validated by back-office.
    bridgedTerrainReports.forEach((r) => {
      const iv = interventions.find((x) => x.id === r.interventionId);
      if (iv?.status === "invoiced") {
        terrainBridge.dismissReport(r.localId);
      }
    });
  }, [bridgedTerrainReports, interventions, terrainBridge]);

  const itemsToShow = activeTab === "requests" ? pendingRequests : validationReports;

  if (!isTenant) {
    return (
      <div
        data-testid="backoffice-inbox-panel"
        style={outfit}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-slate-50/30"
      >
        <IvanaClientChatPanel className="min-h-0" />
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
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[16px] text-[12px] font-bold transition-all",
            activeTab === "chat"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-300/30",
          )}
        >
          Chat
        </button>
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
          Demandes
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
          Rapports
          {validationReports.length + bridgedTerrainCount > 0 && (
            <span className="flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-green-100 text-[9px] text-green-600 border border-green-200">
              {validationReports.length + bridgedTerrainCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "chat" ? (
        <IvanaClientChatPanel className="min-h-0 px-0" />
      ) : (
      <div className={cn(GLASS_PANEL_BODY_SCROLL_COMPACT, "flex min-h-0 flex-1 flex-col gap-3 px-4 pb-6")}>
        {activeTab === "reports" &&
          bridgedTerrainReports.map((r) => (
            (() => {
              const iv = interventions.find((x) => x.id === r.interventionId);
              const first = iv?.clientFirstName ?? "";
              const last = iv?.clientLastName ?? "";
              const fallbackName = iv?.clientName ?? "";
              const nameRaw = `${first} ${last}`.trim() || fallbackName;
              const displayName = nameRaw ? capitalizeName(nameRaw) : `Client · …${r.interventionId.slice(-8)}`;
              const description = iv?.problem || iv?.title || "Rapport terrain (photos + signature)";
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
                        Rapport
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
        itemsToShow.length === 0 &&
        !(activeTab === "reports" && bridgedTerrainCount > 0) ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              {activeTab === "requests" ? (
                <ClipboardList className="h-8 w-8 text-slate-300" />
              ) : (
                <FileCheck className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium">
              {activeTab === "requests" ? "Aucune nouvelle demande" : "Aucun rapport à vérifier"}
            </p>
          </div>
        ) : null}

        {!loading && itemsToShow.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {itemsToShow.map((item, index) => {
              const isRequest = item.status === "pending" || item.status === "pending_needs_address";
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
              const clientName = `${prefix} ${displayLName}`.trim() || "Client Anonyme";

              return (
                <motion.div
                  key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-[24px] border bg-white p-4 transition-all duration-300 hover:shadow-lg",
                    isRequest 
                      ? (isUrgent ? "border-amber-200 bg-amber-50/30" : "border-slate-100")
                      : (item.status === "invoiced" ? "border-green-100 opacity-70" : "border-blue-100")
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isRequest ? (
                          <span className={cn(
                            "flex h-2 w-2 rounded-full",
                            isUrgent ? "bg-amber-500 animate-pulse" : "bg-blue-500"
                          )} />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        <h4 className="text-[15px] font-bold text-slate-800 truncate">
                          {clientName}
                        </h4>
                      </div>
                      <p className="text-[13px] text-slate-500 truncate mb-2">
                        {item.problem || item.title || "Aucune description"}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {isRequest 
                            ? (item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Maintenant")
                            : (item.completedAt ? new Date(item.completedAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "")
                          }
                        </span>
                        <span className="truncate max-w-[120px]">{item.address.split(",")[0]}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight",
                        isRequest 
                          ? (isUrgent ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")
                          : (item.status === "invoiced" ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700")
                      )}>
                        {isRequest ? (isUrgent ? "Urgent" : "Demande") : (item.status === "invoiced" ? "Vérifié" : "Rapport")}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : null}
      </div>
      )}

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
                {(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") ? "Détails Demande" : "Vérification Rapport"}
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
                     {(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") ? "Demande" : "Rapport"} • ID: {selectedItem.id.slice(-6).toUpperCase()}
                   </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  {capitalizeName(selectedItem.clientLastName || selectedItem.clientName || "Client")}
                </h2>
                <p className="text-[15px] font-medium text-slate-500 mt-1">
                  {selectedItem.clientPhone || "Pas de téléphone"}
                </p>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Localisation</span>
                <p className="text-[15px] font-semibold text-slate-800">{formatAddress(selectedItem.address)}</p>
              </div>

              {/* Problem / Report Description */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") ? "Nature du problème" : "Compte-rendu technicien"}
                </span>
                <div className="rounded-[20px] bg-slate-50 p-4 border border-slate-100">
                  <p className="text-[15px] text-slate-800 leading-relaxed">
                    {selectedItem.problem || "Aucune description fournie."}
                  </p>
                </div>
              </div>

              {/* Date & Time management for requests */}
              {(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") && (
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Planification souhaitée</span>
                    {!isEditingDateTime && (
                      <button 
                        onClick={() => {
                          setEditDate(selectedItem.requestedDate || "");
                          setEditTime(selectedItem.requestedTime || "");
                          setIsEditingDateTime(true);
                        }}
                        className="text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        MODIFIER
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
                        <button onClick={() => setIsEditingDateTime(false)} className="text-xs px-3 py-1.5 rounded-[8px] bg-slate-100">Annuler</button>
                        <button onClick={handleUpdateDateTime} className="text-xs px-3 py-1.5 rounded-[8px] bg-slate-900 text-white">Sauver</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-900 font-bold">
                      <Clock className="w-4 h-4" />
                      {selectedItem.requestedDate 
                        ? `${selectedItem.requestedDate} ${selectedItem.requestedTime ? `à ${selectedItem.requestedTime}` : ""}`
                        : "Dès que possible"}
                    </div>
                  )}
                </div>
              )}

              {/* Photos Grid */}
              {(((selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") && selectedItem.attachmentThumbnails) ||
                (!(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") && selectedItem.completionPhotoUrls)) && (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") ? "Photos du client" : "Photos de fin d'intervention"}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      (selectedItem.status === "pending" || selectedItem.status === "pending_needs_address")
                        ? selectedItem.attachmentThumbnails
                        : selectedItem.completionPhotoUrls
                    )?.map((url, i) => (
                      <div key={i} className="aspect-square relative rounded-[20px] overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Intervention" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio / Transcription for requests (under photos) */}
              {(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") ? (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Message Vocal</span>
                  {resolvedAudioUrl ? (
                    <audio controls src={resolvedAudioUrl} className="w-full h-10" />
                  ) : isResolvingAudio ? (
                    <div className="w-full rounded-[18px] border border-slate-200 bg-slate-50/50 px-4 py-3 text-[12px] font-semibold text-slate-500">
                      Chargement du message vocal…
                    </div>
                  ) : (
                    <div className="w-full rounded-[18px] border border-slate-200 bg-slate-50/50 px-4 py-3 text-[12px] font-semibold text-slate-500">
                      Aucun message vocal
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
              {!(selectedItem.status === "pending" || selectedItem.status === "pending_needs_address") && selectedItem.completionSignatureUrl && (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Signature Client</span>
                  <div className="rounded-[20px] bg-slate-50 p-4 border border-slate-100 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedItem.completionSignatureUrl} alt="Signature" className="max-h-32 object-contain" />
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
                    Supprimer
                  </button>
                  <button
                    onClick={() => handleAssign(selectedItem.id)}
                    className="flex-[1.5] flex items-center justify-center gap-2 py-4 px-4 rounded-[20px] bg-blue-600 text-white font-bold text-[14px] shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Confirmer & Assigner
                  </button>
                </>
              ) : (
                <button
                  disabled={selectedItem.status === "invoiced"}
                  onClick={() => handleVerify(selectedItem.id)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-4 px-4 rounded-[20px] font-bold text-[14px] transition-all",
                    selectedItem.status === "invoiced"
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-green-600 text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)] hover:bg-green-700 active:scale-95"
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedItem.status === "invoiced" ? "Rapport déjà validé" : "Valider le rapport"}
                </button>
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
                      aria-label="Retour"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-[15px] font-bold text-slate-800">Rapport terrain</h3>
                    <button
                      type="button"
                      onClick={() => {
                        terrainBridge?.dismissReport(r.localId);
                        setSelectedTerrainLocalId(null);
                      }}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      aria-label="Masquer ce rapport"
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
                          Problème · {description}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Photos</p>
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
                              className={cn("w-full h-full object-cover", PRESENTATION_PRIVACY_MODE ? "blur-lg" : null)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Signature client</p>
                      <div className="rounded-[20px] bg-slate-50 p-4 border border-slate-100 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.signaturePngDataUrl} alt="Signature client" className="max-h-32 object-contain" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-white/80 backdrop-blur-md">
                    <button
                      type="button"
                      data-testid={`backoffice-bridged-report-validate-${r.localId}`}
                      disabled={!iv || isAlreadyValidated}
                      onClick={() => handleVerify(r.interventionId)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-4 px-4 rounded-[20px] font-bold text-[14px] transition-all",
                        !iv
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : isAlreadyValidated
                            ? "bg-emerald-100 text-emerald-700 cursor-not-allowed opacity-70"
                            : "bg-emerald-600 text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)] hover:bg-emerald-700 active:scale-95",
                      )}
                      aria-label="Valider le rapport terrain"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isAlreadyValidated ? "Déjà validé" : "Valider le rapport"}
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
