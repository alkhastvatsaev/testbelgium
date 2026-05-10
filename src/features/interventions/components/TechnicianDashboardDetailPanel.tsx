"use client";

import { useState } from "react";
import { Camera, Clock3, MapPin, User, Play, Navigation, Phone, CheckCircle2, Mic, Pause } from "lucide-react";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SlideAction } from "@/components/ui/slide-action";
import { Badge } from "@/components/ui/badge";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/core/config/firebase";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { useInterventionLive } from "@/features/interventions/useInterventionLive";
import type { Intervention } from "@/features/interventions/types";
import InterventionInvoiceButton from "@/features/interventions/components/InterventionInvoiceButton";

import { guessGenderPrefixFromName } from "@/utils/genderDetection";
import { capitalizeName, formatAddress } from "@/utils/stringUtils";
import { cn } from "@/lib/utils";

import {
  formatScheduledTimeOnly,
  interventionClientLabel,
} from "@/features/interventions/technicianSchedule";
import { useTechnicianFinishJob } from "@/context/TechnicianFinishJobContext";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";
import {
  navigateTechnicianHub,
  TECHNICIAN_HUB_ANCHOR_FINISH,
} from "@/features/interventions/technicianHubNavigation";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const AudioUrlPlayer = ({ url }: { url: string }) => {
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
        aria-label={isPlaying ? "Mettre en pause" : "Lire l'audio"}
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
  const workspace = useCompanyWorkspaceOptional();
  const liveIv = useInterventionLive(caseId);
  const { setFinishJobInterventionId } = useTechnicianFinishJob();
  const pager = useDashboardPagerOptional();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!caseId) {
    return (
      <div
        data-testid="technician-dashboard-detail-empty"
        style={outfit}
        className="flex h-full w-full flex-col items-center justify-center rounded-[inherit] px-5 py-8 text-center"
      >
        <div className="text-[14px] font-bold text-black">
          Sélectionnez une mission pour voir les détails
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
  const showAdminInvoice = workspace?.activeRole === "admin";
  const cardClass = "rounded-[16px] bg-white px-4 py-3 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)] transition-all duration-300";

  const handleUpdateStatus = async (newStatus: Intervention["status"]) => {
    if (!liveIv || isUpdating || !firestore) return;
    setIsUpdating(true);
    try {
      const ref = doc(firestore, "interventions", liveIv.id);
      await updateDoc(ref, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status", err);
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
  const clientDisplayName = `${prefix} ${displayLastName}`.trim() || "Non renseigné";

  const renderContactClient = () => (
    <>
      <div className={cn(cardClass, "flex flex-col items-center text-center")}>
        <div className="text-[16px] font-bold text-black">
          {formatScheduledTimeOnly(liveIv)}
        </div>
      </div>
      <div className={cn(cardClass, "flex flex-col items-center text-center")}>
        <div className="text-[16px] font-bold text-black">
          {clientDisplayName}
        </div>
      </div>
      {(liveIv.clientPhone || liveIv.phone) && (
        <div className={cn(cardClass, "flex flex-col items-center text-center")}>
          <a href={`tel:${liveIv.clientPhone || liveIv.phone}`} className="text-[15px] font-bold text-blue-600 hover:underline">
            {liveIv.clientPhone || liveIv.phone}
          </a>
        </div>
      )}
      {liveIv.address && (
        <div className={cn(cardClass, "flex flex-col items-center text-center")}>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(liveIv.address))}`}
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-bold leading-snug text-black hover:underline text-center"
          >
            {formatAddress(liveIv.address)}
          </a>
        </div>
      )}
    </>
  );

  const renderAudioAndTranscription = () => {
    return (
      <div className={cn(cardClass, "flex flex-col items-center text-center gap-3")}>
        <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wide text-black">
          <Mic className="h-3.5 w-3.5" aria-hidden /> Message Vocal
        </div>
        
        {liveIv.audioUrl ? (
          <div className="w-full flex flex-col gap-2 items-center">
            <AudioUrlPlayer url={liveIv.audioUrl} />
          </div>
        ) : (
          <div className="w-full max-w-[250px] h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-medium border border-slate-200">
            Aucun message vocal
          </div>
        )}

        {liveIv.transcription && (
          <div className="mt-2 text-[14px] font-bold text-black italic bg-slate-50 p-3 rounded-xl border border-slate-100 w-full text-left">
            "{liveIv.transcription}"
          </div>
        )}
      </div>
    );
  };

  const renderPending = () => (
    <motion.div
      key="pending"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 h-full justify-between pb-2"
    >
      <div className="space-y-2.5">
        {renderContactClient()}
        
        <div className={cn(cardClass, "flex flex-col items-center text-center")}>
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wide text-black">
            <User className="h-3.5 w-3.5" aria-hidden /> Intitulé
          </div>
          <div className="mt-1 text-[14px] font-bold text-black">{liveIv.title || "—"}</div>
        </div>
        {renderAudioAndTranscription()}
      </div>

      <button
        onClick={() => handleUpdateStatus("en_route")}
        disabled={isUpdating}
        className="group flex min-h-[58px] shrink-0 w-full items-center justify-center gap-2 rounded-[22px] bg-blue-600 px-4 text-[17px] font-bold text-white shadow-[0_14px_40px_-14px_rgba(37,99,235,0.55)] transition-all hover:bg-blue-700 hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.6)] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
      >
        <Play className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
        {isUpdating ? "Mise à jour..." : "Démarrer l'intervention"}
      </button>
    </motion.div>
  );

  const renderEnRoute = () => (
    <motion.div
      key="en_route"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 h-full justify-between pb-2"
    >
      <div className="space-y-2.5">
        <div className="rounded-[16px] bg-indigo-50/60 p-4 border border-indigo-100/60 shadow-[0_8px_24px_-8px_rgba(99,102,241,0.15)]">
          <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-black">Navigation GPS</div>
                <div className="mt-1 text-[15px] font-bold text-black leading-snug">{formatAddress(liveIv.address) || "Pas d'adresse"}</div>
             </div>
             {liveIv.address && (
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(liveIv.address))}`}
                  target="_blank" rel="noreferrer"
                  className="flex shrink-0 h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-colors active:scale-95"
                >
                  <Navigation className="h-5 w-5" />
                </a>
             )}
          </div>
        </div>

        {renderContactClient()}
        {renderAudioAndTranscription()}
      </div>

      <button
        onClick={() => handleUpdateStatus("in_progress")}
        disabled={isUpdating}
        className="group flex min-h-[58px] shrink-0 w-full items-center justify-center gap-2 rounded-[22px] bg-amber-500 px-4 text-[17px] font-bold text-white shadow-[0_14px_40px_-14px_rgba(245,158,11,0.55)] transition-all hover:bg-amber-600 hover:shadow-[0_20px_40px_-10px_rgba(245,158,11,0.6)] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
      >
        <MapPin className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
        {isUpdating ? "Mise à jour..." : "Je suis sur place"}
      </button>
    </motion.div>
  );

  const renderInProgress = () => (
    <motion.div
      key="in_progress"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 h-full justify-between pb-2"
    >
      <div className="space-y-2.5">
        {renderContactClient()}
        {liveIv.problem && (
          <div className={cardClass}>
            <div className="whitespace-pre-wrap text-[14px] font-bold leading-relaxed text-black text-center">{liveIv.problem}</div>
          </div>
        )}
        {renderAudioAndTranscription()}
      </div>


      <SlideAction
        onAction={onStartFinishJob}
        label="Terminer l'intervention"
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
      className="flex flex-col gap-6 h-full pb-2"
    >
      <div className="flex flex-col items-center justify-center py-6 bg-white/50 rounded-[16px] border border-emerald-100/50 mt-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-[18px] font-bold text-black">Mission accomplie</h3>
        <div className="text-[13px] font-bold text-black mt-1 text-center px-4">Cette intervention est terminée et clôturée.</div>
      </div>

      {showAdminInvoice && (
        <div className={cardClass}>
          <div className="text-[11px] font-bold uppercase tracking-wide text-black mb-3">Administration</div>
          <InterventionInvoiceButton iv={liveIv} variant="detailDrawer" />
        </div>
      )}
    </motion.div>
  );

  const renderContent = () => {
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


      <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex-1 overflow-y-auto overflow-x-hidden px-4 py-2`}>
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </div>
  );
}
