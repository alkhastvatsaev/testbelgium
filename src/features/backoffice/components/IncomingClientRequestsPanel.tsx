"use client";

import { useState } from "react";
import { ClipboardList, ArrowLeft, Trash2, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { firestore } from "@/core/config/firebase";

import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { cn } from "@/lib/utils";
import { useBackOfficeInterventions } from "@/features/backoffice/useBackOfficeInterventions";
import type { Intervention } from "@/features/interventions/types";
import { buildAssignInterventionToTechnicianUpdate } from "@/features/interventions/assignInterventionToTechnician";
import { getDefaultAssignedTechnicianUid } from "@/features/interventions/defaultAssignedTechnicianUid";
import { isInterventionPendingBackOfficeIntake } from "@/features/interventions/technicianSchedule";
import { capitalizeName, formatAddress } from "@/utils/stringUtils";
import { useResolvedInterventionAudio } from "@/features/backoffice/useResolvedInterventionAudio";
import { guessGenderPrefixFromName } from "@/utils/genderDetection";
import { useTranslation } from "@/core/i18n/I18nContext";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

export default function IncomingClientRequestsPanel() {
  const { t } = useTranslation();
  const workspace = useCompanyWorkspaceOptional();
  
  const cid = workspace?.isTenantUser ? workspace.activeCompanyId : null;
  const { interventions, loading } = useBackOfficeInterventions(cid);

  const [selectedRequest, setSelectedRequest] = useState<Intervention | null>(null);
  const { resolvedAudioUrl } = useResolvedInterventionAudio(selectedRequest);
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");


  const pendingRequests = interventions
    .filter((inv) => isInterventionPendingBackOfficeIntake(inv))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "interventions", id));
      toast.success(String(t("backoffice.toasts.request_deleted")));
      setSelectedRequest(null);
    } catch (e) {
      toast.error(String(t("backoffice.toasts.delete_failed")));
    }
  };

  const handleAssign = async (id: string) => {
    if (!firestore) return;
    try {
      const row = interventions.find((x) => x.id === id);
      await updateDoc(
        doc(firestore, "interventions", id),
        buildAssignInterventionToTechnicianUpdate(row, getDefaultAssignedTechnicianUid()),
      );
      toast.success(String(t("backoffice.toasts.request_assigned")));
      setSelectedRequest(null);
    } catch (e) {
      toast.error(String(t("backoffice.toasts.assign_failed")));
    }
  };

  const handleUpdateDateTime = async () => {
    if (!selectedRequest || !firestore) return;
    try {
      await updateDoc(doc(firestore, "interventions", selectedRequest.id), {
        requestedDate: editDate,
        requestedTime: editTime,
      });
      toast.success(String(t("backoffice.toasts.datetime_updated")));
      setSelectedRequest({
        ...selectedRequest,
        requestedDate: editDate,
        requestedTime: editTime,
      });
      setIsEditingDateTime(false);
    } catch (error) {
      toast.error(String(t("backoffice.toasts.update_failed")));
    }
  };

  if (!workspace || !workspace.isTenantUser || !workspace.memberships.length) {
    return (
      <div
        data-testid="incoming-requests-gate"
        style={outfit}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] px-4 py-6"
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-[16px] border border-amber-200/50 bg-amber-50/80 px-4 py-5 text-[13px] shadow-[0_14px_36px_-18px_rgba(15,23,42,0.12)]">
          <p className="text-amber-800 font-medium">{String(t("backoffice.incoming_requests.company_required"))}</p>
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
            <p className="text-sm text-slate-500 font-medium">{String(t("backoffice.incoming_requests.no_new_request"))}</p>
          </div>
        ) : null}

        {!loading && pendingRequests.length > 0 ? (
          <>
            {pendingRequests.map((req, index) => {
              let fName = req.clientFirstName;
              let lName = req.clientLastName;
              if (!fName && !lName && req.clientName) {
                const parts = req.clientName.trim().split(" ");
                fName = parts[0];
                lName = parts.slice(1).join(" ");
              }
              const prefix = fName ? guessGenderPrefixFromName(fName) : "";
              const displayLName = capitalizeName(lName || fName || "");
              const clientName = `${prefix} ${displayLName}`.trim() || String(t("backoffice.inbox.anonymous_client"));
              
              const cardClass = "shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)] hover:shadow-[0_14px_32px_-10px_rgba(15,23,42,0.18)]";

              return (
                <motion.div
                  key={req.id}
                  data-testid={`incoming-request-card-${req.id}`}
                  onClick={() => setSelectedRequest(req)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`group relative grid cursor-pointer grid-cols-1 items-center gap-2 rounded-[20px] bg-white px-4 py-4 transition-all duration-300 hover:bg-white ${cardClass}`}
                >
                  <h3 className="text-[14px] font-semibold text-slate-800 truncate text-center">
                    {clientName}
                  </h3>
                </motion.div>
              );
            })}
          </>
        ) : null}
      </div>

      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex flex-col bg-white/95 backdrop-blur-md rounded-[inherit] overflow-hidden shadow-2xl"
          >
            {/* Header with Back button */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100/50">
              <button 
                onClick={() => {
                  setSelectedRequest(null);
                  setIsEditingDateTime(false);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-slate-800">{String(t("backoffice.incoming_requests.request_details"))}</span>
              <div className="w-8" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {(() => {
                let fName = selectedRequest.clientFirstName;
                let lName = selectedRequest.clientLastName;
                if (!fName && !lName && selectedRequest.clientName) {
                  const parts = selectedRequest.clientName.trim().split(" ");
                  fName = parts[0];
                  lName = parts.slice(1).join(" ");
                }
                const prefix = fName ? guessGenderPrefixFromName(fName) : "";
                const displayLName = capitalizeName(lName || fName || "");
                const clientDisplayName = `${prefix} ${displayLName}`.trim() || String(t("backoffice.inbox.anonymous_client"));

                return (
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{String(t("backoffice.incoming_requests.client"))}</span>
                    <p className="text-[16px] font-bold text-black mt-1">
                      {clientDisplayName}
                    </p>
                    {selectedRequest.clientPhone && (
                      <p className="text-[14px] font-bold text-black mt-0.5">{selectedRequest.clientPhone}</p>
                    )}
                  </div>
                );
              })()}

              {selectedRequest.address && (
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{String(t("backoffice.incoming_requests.address"))}</span>
                  <p className="text-[15px] font-bold text-slate-800 mt-1">{formatAddress(selectedRequest.address)}</p>
                </div>
              )}

              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{String(t("backoffice.incoming_requests.problem"))}</span>
                <p className="text-[15px] text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                  {selectedRequest.problem || selectedRequest.title || String(t("backoffice.inbox.no_description"))}
                </p>
              </div>

              {(resolvedAudioUrl || selectedRequest.transcription) && (
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{String(t("backoffice.incoming_requests.voice_message"))}</span>
                  {resolvedAudioUrl && (
                    <audio controls src={resolvedAudioUrl} className="w-full h-10 mt-2" />
                  )}
                  {selectedRequest.transcription && (
                    <div className="mt-2 rounded-[12px] bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[14px] text-slate-700 italic">"{selectedRequest.transcription}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Date souhaitée */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{String(t("backoffice.incoming_requests.desired_datetime"))}</span>
                  {!isEditingDateTime && (
                    <button 
                      onClick={() => {
                        setEditDate(selectedRequest.requestedDate || "");
                        setEditTime(selectedRequest.requestedTime || "");
                        setIsEditingDateTime(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      {selectedRequest.requestedDate ? String(t("backoffice.inbox.edit")) : String(t("common.add"))}
                    </button>
                  )}
                </div>
                
                {isEditingDateTime ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="flex-1 rounded-[12px] border border-slate-200 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                      />
                      <input 
                        type="time" 
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="flex-1 rounded-[12px] border border-slate-200 px-3 py-2 text-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-1">
                      <button 
                        onClick={() => setIsEditingDateTime(false)}
                        className="text-xs px-3 py-1.5 rounded-[8px] bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                      >
                        {String(t("backoffice.incoming_requests.cancel"))}
                      </button>
                      <button 
                        onClick={handleUpdateDateTime}
                        className="text-xs px-3 py-1.5 rounded-[8px] bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
                      >
                        {String(t("backoffice.incoming_requests.save"))}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[14px] font-semibold text-blue-900 mt-1">
                    {selectedRequest.requestedDate 
                      ? `${selectedRequest.requestedDate} ${selectedRequest.requestedTime ? `à ${selectedRequest.requestedTime}` : ""}`
                      : String(t("backoffice.inbox.no_description"))}
                  </p>
                )}
              </div>

              {selectedRequest.urgency && (
                <div>
                   <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[12px] font-semibold tracking-wide text-amber-800 uppercase mt-2">
                     {String(t("common.urgent"))}: {selectedRequest.urgency}
                   </span>
                </div>
              )}

              {selectedRequest.attachmentThumbnails && selectedRequest.attachmentThumbnails.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Photos</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {selectedRequest.attachmentThumbnails.map((photo, i) => (
                      <div key={i} className="aspect-square relative rounded-[12px] overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt={`${String(t("backoffice.inbox.photos"))} ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-100/50 flex gap-3 bg-white">
              <button
                onClick={() => handleDelete(selectedRequest.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-[16px] border border-red-200 bg-red-50 text-red-600 font-semibold text-[14px] transition-colors hover:bg-red-100 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                {String(t("backoffice.incoming_requests.delete"))}
              </button>
              <button
                type="button"
                data-testid="incoming-request-assign"
                onClick={() => handleAssign(selectedRequest.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-[16px] bg-slate-900 text-white font-semibold text-[14px] transition-all hover:bg-slate-800 hover:shadow-[0_8px_20px_rgba(15,23,42,0.2)] active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                {String(t("backoffice.incoming_requests.assign"))}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
