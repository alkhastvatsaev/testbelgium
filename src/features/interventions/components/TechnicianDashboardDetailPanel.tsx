"use client";

import { useState } from "react";
import { Camera, MapPin, Play, Navigation, CheckCircle2, Pause } from "lucide-react";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SlideAction } from "@/components/ui/slide-action";
import { Badge } from "@/components/ui/badge";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/core/config/firebase";
import { toast } from "sonner";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useInterventionLive } from "@/features/interventions/useInterventionLive";
import type { Intervention } from "@/features/interventions/types";

import { guessGenderPrefixFromName } from "@/utils/genderDetection";
import { capitalizeName, formatAddress } from "@/utils/stringUtils";
import { cn } from "@/lib/utils";

import {
  formatScheduledTimeOnly,
  interventionClientLabel,
} from "@/features/interventions/technicianSchedule";
import { useTechnicianFinishJob } from "@/context/TechnicianFinishJobContext";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import { useTranslation } from "@/core/i18n/I18nContext";
import {
  navigateTechnicianHub,
  TECHNICIAN_HUB_ANCHOR_FINISH,
} from "@/features/interventions/technicianHubNavigation";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const AudioUrlPlayer = ({ url, t }: { url: string; t: (key: string) => string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error("Audio playback failed", err);
            setIsPlaying(false);
          });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      if (audioRef.current.duration && audioRef.current.duration !== Infinity) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      if (audioRef.current.duration && audioRef.current.duration !== Infinity) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time === Infinity) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex w-full items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50/50 p-2 shadow-sm transition-all hover:shadow-md">
      <audio 
        ref={audioRef} 
        src={url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden" 
      />
      <button 
        type="button"
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:scale-105 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600/20"
        aria-label={isPlaying ? t("backoffice.audio_player.pause") : t("backoffice.audio_player.play")}
      >
        {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
      </button>
      <div className="flex flex-1 flex-col gap-1.5 px-1">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div 
            className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-100"
            style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold tracking-wider text-slate-500">
          <span>{formatTime(progress)}</span>
          <span>{duration > 0 ? formatTime(duration) : "0:00"}</span>
        </div>
      </div>
    </div>
  );
};

export default function TechnicianDashboardDetailPanel({
  caseId,
}: {
  caseId: string | null;
}) {
  const liveIv = useInterventionLive(caseId);
  const { setFinishJobInterventionId } = useTechnicianFinishJob();
  const pager = useDashboardPagerOptional();
  const [isUpdating, setIsUpdating] = useState(false);
  const { t } = useTranslation();

  if (!caseId) {
    return (
      <div
        data-testid="technician-dashboard-detail-empty"
        style={outfit}
        className="flex h-full w-full flex-col items-center justify-center rounded-[inherit] px-5 py-8 text-center"
      >
        <div className="text-[14px] font-bold text-black">
          {t("technician_hub.dashboard.detail.no_mission_selected")}
        </div>
      </div>
    );
  }

  if (!liveIv) {
    return (
      <div
        data-testid="technician-dashboard-detail-loading"
        style={outfit}
        className="flex h-full w-full flex-col p-4"
      >
        <div className="h-10 w-1/2 animate-pulse rounded-md bg-slate-200/60 mb-6" />
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-full animate-pulse rounded-[20px] bg-slate-200/60" />
          ))}
        </div>
      </div>
    );
  }

  const client = interventionClientLabel(liveIv);
  const cardClass = "flex flex-col items-center text-center py-1.5";
  const mainContainerClass = "rounded-[24px] bg-white p-5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] border border-white/40 backdrop-blur-sm";

  const handleUpdateStatus = async (newStatus: Intervention["status"]) => {
    if (!liveIv || isUpdating || !firestore) return;
    setIsUpdating(true);
    try {
      const ref = doc(firestore, "interventions", liveIv.id);
      await updateDoc(ref, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error(String(t("technician_hub.dashboard.detail.update_failed")));
    } finally {
      setIsUpdating(false);
    }
  };

  const onStartFinishJob = () => {
    setFinishJobInterventionId(liveIv.id);
    navigateTechnicianHub(pager, TECHNICIAN_HUB_ANCHOR_FINISH);
  };

  let firstName = liveIv.clientFirstName;
  let lastName = liveIv.clientLastName;

  if (!firstName && !lastName && liveIv.clientName) {
    const parts = liveIv.clientName.trim().split(" ");
    firstName = parts[0];
    lastName = parts.slice(1).join(" ");
  }

  const prefix = firstName ? guessGenderPrefixFromName(firstName) : "";
  const displayLastName = capitalizeName(lastName || firstName || "");
  const clientDisplayName = `${prefix} ${displayLastName}`.trim() || t("technician_hub.dashboard.detail.not_provided");

  const renderContactClient = () => (
    <div className="flex flex-col gap-3 w-full">
      <div className={cardClass}>
        <div className="text-[18px] font-black text-black">
          {formatScheduledTimeOnly(liveIv)}
        </div>
      </div>
      
      <div className="h-px bg-slate-100/80 w-full" />
      
      <div className={cardClass}>
        <div className="text-[18px] font-black text-black">
          {clientDisplayName}
        </div>
      </div>

      {(liveIv.clientPhone || liveIv.phone) && (
        <>
          <div className="h-px bg-slate-100/80 w-full" />
          <div className={cardClass}>
            <a href={`tel:${liveIv.clientPhone || liveIv.phone}`} className="text-[17px] font-black text-blue-600 hover:scale-105 transition-transform flex items-center gap-2">
              {liveIv.clientPhone || liveIv.phone}
            </a>
          </div>
        </>
      )}

      {liveIv.address && (
        <>
          <div className="h-px bg-slate-100/80 w-full" />
          <div className={cardClass}>
             <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(liveIv.address))}`}
              target="_blank"
              rel="noreferrer"
              className="text-[15px] font-bold leading-snug text-black hover:text-blue-600 transition-colors text-center"
            >
              {formatAddress(liveIv.address)}
            </a>
          </div>
        </>
      )}
    </div>
  );

  const renderAudioAndTranscription = () => {
    return (
      <div className="flex flex-col items-center text-center gap-2 w-full">
        
        {liveIv.audioUrl ? (
          <div className="w-full flex flex-col gap-2 items-center">
            <AudioUrlPlayer url={liveIv.audioUrl} t={t} />
          </div>
        ) : (
          <div className="w-full max-w-[250px] h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 text-sm font-medium border border-slate-100">
            {t("technician_hub.dashboard.detail.no_voice_message")}
          </div>
        )}

        {liveIv.transcription && (
          <div className="mt-1 text-[15px] font-bold text-black italic bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50 w-full text-left leading-relaxed">
            "{liveIv.transcription}"
          </div>
        )}
      </div>
    );
  };

  const renderAwaitingAssignmentHint = () => (
    <motion.div
      key="assigned-hint"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4 h-full pb-2"
      data-testid="technician-assignment-detail-hint"
    >
      <div className={mainContainerClass}>
        <div className="flex flex-col gap-4">
          <p className="rounded-[16px] border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-center text-[14px] font-semibold text-amber-950">
            {t("technician_hub.dashboard.detail.assignment_respond_in_list")}
          </p>
          {renderContactClient()}
          <div className="h-px bg-slate-100/80 w-full" />
          {renderAudioAndTranscription()}
        </div>
      </div>
    </motion.div>
  );
  const renderPending = () => (
    <motion.div
      key="pending"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4 h-full justify-between pb-2"
    >
      <div className={mainContainerClass}>
        <div className="flex flex-col gap-4">
          {renderContactClient()}
          
          <div className="h-px bg-slate-100/80 w-full" />

          <div className={cardClass}>
            <div className="text-[17px] font-black text-black">{liveIv.title || "—"}</div>
          </div>

          <div className="h-px bg-slate-100/80 w-full" />
          
          {renderAudioAndTranscription()}
        </div>
      </div>

      <button
        onClick={() => handleUpdateStatus("en_route")}
        disabled={isUpdating}
        className="group flex min-h-[54px] shrink-0 w-full items-center justify-center gap-2 rounded-[22px] bg-blue-600 px-4 text-[17px] font-bold text-white shadow-[0_14px_40px_-14px_rgba(37,99,235,0.55)] transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
      >
        <Play className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
        {isUpdating ? t("technician_hub.dashboard.detail.updating") : t("technician_hub.dashboard.detail.start_intervention")}
      </button>
    </motion.div>
  );

  const renderEnRoute = () => (
    <motion.div
      key="en_route"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4 h-full justify-between pb-2"
    >
      <div className={mainContainerClass}>
        <div className="flex flex-col gap-4">
          <div className="rounded-[20px] bg-blue-600 p-4 shadow-[0_12px_24px_-8px_rgba(37,99,235,0.4)] text-white">
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-100/80 mb-1">{t("technician_hub.dashboard.detail.gps_navigation")}</div>
                  <div className="text-[15px] font-bold leading-snug">{formatAddress(liveIv.address) || t("technician_hub.dashboard.detail.no_address")}</div>
               </div>
               {liveIv.address && (
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(liveIv.address))}`}
                    target="_blank" rel="noreferrer"
                    className="flex shrink-0 h-11 w-11 items-center justify-center rounded-full bg-white text-blue-600 shadow-xl hover:scale-105 transition-transform active:scale-95"
                  >
                    <Navigation className="h-5 w-5 fill-current" />
                  </a>
               )}
            </div>
          </div>

          <div className="h-px bg-slate-100/80 w-full" />
          {renderContactClient()}
          <div className="h-px bg-slate-100/80 w-full" />
          {renderAudioAndTranscription()}
        </div>
      </div>

      <button
        onClick={() => handleUpdateStatus("in_progress")}
        disabled={isUpdating}
        className="group flex min-h-[54px] shrink-0 w-full items-center justify-center gap-2 rounded-[22px] bg-amber-500 px-4 text-[17px] font-bold text-white shadow-[0_14px_40px_-14px_rgba(245,158,11,0.55)] transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
      >
        <MapPin className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
        {isUpdating ? t("technician_hub.dashboard.detail.updating") : t("technician_hub.dashboard.detail.on_site")}
      </button>
    </motion.div>
  );

  const renderInProgress = () => (
    <motion.div
      key="in_progress"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4 h-full justify-between pb-2"
    >
      <div className={mainContainerClass}>
        <div className="flex flex-col gap-4">
          {renderContactClient()}
          
          {liveIv.problem && (
            <>
              <div className="h-px bg-slate-100/80 w-full" />
              <div className={cardClass}>
                <div className="whitespace-pre-wrap text-[15px] font-bold leading-relaxed text-black text-center">{liveIv.problem}</div>
              </div>
            </>
          )}
          
          <div className="h-px bg-slate-100/80 w-full" />
          {renderAudioAndTranscription()}
        </div>
      </div>


      <SlideAction
        onAction={onStartFinishJob}
        label={t("technician_hub.dashboard.detail.finish_job")}
        icon={Camera}
        className="shrink-0"
      />
    </motion.div>
  );

  const renderDone = () => (
    <motion.div
      key="done"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4 h-full pb-2"
    >
      <div className="flex flex-col items-center justify-center py-5 bg-white/50 rounded-[16px] border border-emerald-100/50 mt-4 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="text-[14px] font-bold text-black text-center px-4">{t("technician_hub.dashboard.detail.mission_completed")}</div>
      </div>
    </motion.div>
  );

  const renderContent = () => {
    if (liveIv.status === "assigned") {
      return renderAwaitingAssignmentHint();
    }
    if (liveIv.status === "pending" || liveIv.status === "pending_needs_address") return renderPending();
    if (liveIv.status === "en_route") return renderEnRoute();
    if (liveIv.status === "in_progress") return renderInProgress();
    return renderDone();
  }

  return (
    <div
      data-testid="technician-dashboard-detail"
      style={outfit}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
    >


      <div className="flex-1 overflow-hidden px-4 py-2 flex flex-col">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </div>
  );
}
