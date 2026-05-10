"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  url: string;
  className?: string;
};

function formatTime(time: number) {
  if (!time || Number.isNaN(time) || time === Infinity) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Lecteur message vocal — Détails demande (back-office / PWA) : gros tap targets, barre seekable.
 */
export default function RequestDetailAudioPlayer({ url, className }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const scrubbingRef = useRef(false);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      return;
    }
    void el.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false),
    );
  };

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = audioRef.current;
      const bar = barRef.current;
      if (!el || !bar || !duration || duration === Infinity) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      el.currentTime = ratio * duration;
      setProgress(el.currentTime);
    },
    [duration],
  );

  const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    scrubbingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  };

  const onBarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    seekFromClientX(e.clientX);
  };

  const endScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    scrubbingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const downloadRecording = () => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "message-vocal";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      data-testid="backoffice-request-detail-audio-player"
      className={cn(
        "flex w-full touch-manipulation items-center gap-3 rounded-[20px] border border-slate-200/90 bg-white p-3 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        className="hidden"
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el) setProgress(el.currentTime);
        }}
        onLoadedMetadata={() => {
          const el = audioRef.current;
          if (el?.duration && el.duration !== Infinity) setDuration(el.duration);
        }}
        onDurationChange={() => {
          const el = audioRef.current;
          if (el?.duration && el.duration !== Infinity) setDuration(el.duration);
        }}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <button
        type="button"
        onClick={togglePlay}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition active:scale-[0.97] hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25"
        aria-label={isPlaying ? "Mettre en pause" : "Lire le message vocal"}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" fill="currentColor" aria-hidden />
        ) : (
          <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" aria-hidden />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Position dans l'enregistrement"
          aria-valuemin={0}
          aria-valuemax={duration > 0 ? Math.round(duration) : 0}
          aria-valuenow={duration > 0 ? Math.round(progress) : 0}
          className="relative h-4 w-full cursor-pointer select-none rounded-full bg-slate-100"
          onPointerDown={onBarPointerDown}
          onPointerMove={onBarPointerMove}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
          onKeyDown={(e) => {
            const el = audioRef.current;
            if (!el || !duration) return;
            const step = Math.max(1, duration * 0.05);
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              el.currentTime = Math.min(duration, el.currentTime + step);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              el.currentTime = Math.max(0, el.currentTime - step);
            }
          }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-slate-900 transition-[width] duration-100 ease-out"
              style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }}
            />
          </div>
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="tabular-nums">{formatTime(progress)}</span>
          <span className="tabular-nums">{duration > 0 ? formatTime(duration) : "—:—"}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={downloadRecording}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition active:scale-[0.97] hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
        aria-label="Télécharger le message vocal"
      >
        <Download className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
