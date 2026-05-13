"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore as db } from "@/core/config/firebase";
import GalaxyButton from "@/core/ui/GalaxyButton/GalaxyButton";
import Waveform from "@/core/ui/Waveform/Waveform";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Square } from "lucide-react";
import { AI_STRIP_EDGE_INSET_PX } from "@/features/dispatch/aiStripAnchor";
import { useAiStripInsetRect } from "@/features/dispatch/useAiStripInsetRect";
import { useDashboardPagerOptional } from "@/features/dashboard/dashboardPagerContext";

const LS_UPLOAD_LAST_SEEN = "ai_upload_last_seen_mtime";


function uploadAudioBasenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url, "http://localhost").pathname;
    const seg = pathname.split("/").filter(Boolean);
    return (seg[seg.length - 1] ?? "").toLowerCase();
  } catch {
    return "";
  }
}

function queueFindIndexByBasename(q: QueuedClip[], url: string): number {
  const b = uploadAudioBasenameFromUrl(url);
  if (!b) return -1;
  return q.findIndex((c) => uploadAudioBasenameFromUrl(c.url) === b);
}

export type QueuedClip = {
  url: string;
  createdAt: string;
  source: "disk" | "firestore";
  firestoreUpdatedAt?: string;
};

type AudiosPayload = {
  audios: Array<{ name: string; url: string; createdAt: string; transcript: string | null }>;
};


function isPollableDiskAudioName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.endsWith(".m4a") || n.endsWith(".mp3") || n.endsWith(".wav") || n.endsWith(".amr")
  );
}

function serializeFirestoreUpdatedAt(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return String(v);
}


function isRecoverablePlaybackError(err: unknown): boolean {
  const name =
    err instanceof DOMException
      ? err.name
      : typeof err === "object" && err !== null && "name" in err
        ? String((err as { name: unknown }).name)
        : "";
  return name === "NotAllowedError" || name === "NotSupportedError";
}


function mimeFromAudioUrl(url: string): string {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".m4a") || path.endsWith(".mp4") || path.endsWith(".aac")) return "audio/mp4";
  if (path.endsWith(".mp3") || path.endsWith(".mpeg")) return "audio/mpeg";
  if (path.endsWith(".ogg")) return "audio/ogg";
  if (path.endsWith(".wav")) return "audio/wav";
  return "audio/mp4";
}

function waitForCanPlay(el: HTMLAudioElement, timeoutMs: number): Promise<void> {
  if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(t);
      el.removeEventListener("canplay", onOk);
      el.removeEventListener("canplaythrough", onOk);
      el.removeEventListener("loadeddata", onOk);
      el.removeEventListener("error", onErr);
      resolve();
    };
    const onOk = () => done();
    const onErr = () => done();
    const t = setTimeout(done, timeoutMs);
    el.addEventListener("canplay", onOk, { once: true });
    el.addEventListener("canplaythrough", onOk, { once: true });
    el.addEventListener("loadeddata", onOk, { once: true });
    el.addEventListener("error", onErr, { once: true });
  });
}


async function probeMediaUrlOk(href: string): Promise<boolean> {
  try {
    const h = await fetch(href, { method: "HEAD", cache: "no-store" });
    if (h.ok) return true;
    if (h.status === 405 || h.status === 501) {
      const g = await fetch(href, {
        method: "GET",
        cache: "no-store",
        headers: { Range: "bytes=0-0" },
      });
      return g.ok || g.status === 206;
    }
    return false;
  } catch {
    return false;
  }
}


function uploadPathCandidatesFromUrl(clipUrl: string, origin: string): string[] {
  try {
    const parsed = new URL(clipUrl, origin);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const ui = pathParts.indexOf("uploads");
    const relAfterUploads = ui >= 0 ? pathParts.slice(ui + 1).join("/") : "";
    const baseOnly = pathParts[pathParts.length - 1] ?? "";
    return [...new Set([relAfterUploads, baseOnly].filter(Boolean))];
  } catch {
    return [];
  }
}

async function resolveClipPublicUrl(clipUrl: string): Promise<string> {
  if (typeof window === "undefined") return clipUrl;
  const parsed = new URL(clipUrl, window.location.origin);
  if (parsed.origin !== window.location.origin) return clipUrl;
  if (await probeMediaUrlOk(parsed.href)) return clipUrl;

  for (const name of uploadPathCandidatesFromUrl(clipUrl, window.location.origin)) {
    try {
      const r = await fetch(`/api/ai/resolve-audio-url?name=${encodeURIComponent(name)}`, {
        cache: "no-store",
      });
      if (!r.ok) continue;
      const j = (await r.json()) as { url?: string };
      if (j.url && typeof j.url === "string") return j.url;
    } catch {
      /* suivant */
    }
  }
  return clipUrl;
}


export type AiPlaybackSync =
  | {
      clipUrl: string;
      currentTime: number;
      duration: number;
      playing: boolean;
    }
  | null;

type AiAssistantProps = {
  
  onUserPressPlay?: () => void;
  
  onPlaybackSync?: (sync: AiPlaybackSync) => void;
  
  onActiveClipUrlChange?: (clipPublicUrl: string | null) => void;
  
  transcriptOverlayVisible?: boolean;
  onUserLongPress?: () => void;
  onQueueChange?: (queue: QueuedClip[]) => void;
};

export default function AiAssistant({
  onUserPressPlay,
  onPlaybackSync,
  onActiveClipUrlChange,
  transcriptOverlayVisible = false,
  onUserLongPress,
  onQueueChange,
}: AiAssistantProps = {}) {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [queue, setQueue] = useState<QueuedClip[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const pager = useDashboardPagerOptional();

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferMetaRef = useRef<{
    startCtxTime: number;
    duration: number;
    clipUrl: string;
  } | null>(null);
  const queueRef = useRef<QueuedClip[]>([]);
  const pausedByUserRef = useRef(false);
  const diskInitRef = useRef(false);
  const isFirstFirestoreSnapshot = useRef(true);
  const pendingPlayRef = useRef(false);
  const isPlayingRef = useRef(false);
  
  const playSessionRef = useRef(0);
  const mountedRef = useRef(true);
  const onPlaybackSyncRef = useRef<AiAssistantProps["onPlaybackSync"]>(undefined);
  const onActiveClipUrlChangeRef = useRef<AiAssistantProps["onActiveClipUrlChange"]>(undefined);
  const playbackRafRef = useRef(0);

  const flushPlaybackSync = useCallback(() => {
    const cb = onPlaybackSyncRef.current;
    if (!cb) return;
    const head = queueRef.current[0];
    const ctx = audioContextRef.current;
    const bufMeta = bufferMetaRef.current;
    if (bufMeta && ctx && head) {
      const t = Math.max(0, ctx.currentTime - bufMeta.startCtxTime);
      const d = bufMeta.duration;
      cb({
        clipUrl: bufMeta.clipUrl,
        currentTime: Math.min(t, d),
        duration: d,
        playing: t < d && bufferSourceRef.current !== null,
      });
      return;
    }
    const el = audioRef.current;
    if (!el || !head) {
      cb(null);
      return;
    }
    const d = el.duration;
    cb({
      clipUrl: head.url,
      currentTime: el.currentTime,
      duration: Number.isFinite(d) && d > 0 ? d : 0,
      playing: !el.paused && !el.ended,
    });
  }, []);

  const cancelPlaybackSyncRaf = useCallback(() => {
    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = 0;
    }
  }, []);

  const schedulePlaybackSyncRaf = useCallback(() => {
    cancelPlaybackSyncRaf();
    const tick = () => {
      if (!mountedRef.current) return;
      flushPlaybackSync();
      const el = audioRef.current;
      const bufOn = bufferSourceRef.current !== null;
      const elPlaying = el && !el.paused && !el.ended;
      if (bufOn || elPlaying) {
        playbackRafRef.current = requestAnimationFrame(tick);
      }
    };
    playbackRafRef.current = requestAnimationFrame(tick);
  }, [flushPlaybackSync, cancelPlaybackSyncRaf]);

  const flushPlaybackSyncRef = useRef(flushPlaybackSync);
  const cancelPlaybackSyncRafRef = useRef(cancelPlaybackSyncRaf);
  const schedulePlaybackSyncRafRef = useRef(schedulePlaybackSyncRaf);
  flushPlaybackSyncRef.current = flushPlaybackSync;
  cancelPlaybackSyncRafRef.current = cancelPlaybackSyncRaf;
  schedulePlaybackSyncRafRef.current = schedulePlaybackSyncRaf;

  useEffect(() => {
    onPlaybackSyncRef.current = onPlaybackSync;
  }, [onPlaybackSync]);

  useEffect(() => {
    onActiveClipUrlChangeRef.current = onActiveClipUrlChange;
  }, [onActiveClipUrlChange]);

  useEffect(() => {
    mountedRef.current = true;

    // Fix for demo: ensure we don't load old historical messages as "new" on first load
    if (typeof window !== "undefined") {
      if (!localStorage.getItem(LS_UPLOAD_LAST_SEEN)) {
        // We don't have a marker, but we don't want to see all history.
        // We'll set a marker to "now" so only future uploads are shown.
        localStorage.setItem(LS_UPLOAD_LAST_SEEN, new Date().toISOString());
      }
      if (!localStorage.getItem("ai_last_listened_updated_at")) {
        // Same for Firestore status
        localStorage.setItem("ai_last_listened_updated_at", "initial-demo-marker");
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    queueRef.current = queue;
    onQueueChange?.(queue);
  }, [queue, onQueueChange]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const stopBufferPlayback = useCallback(() => {
    if (bufferSourceRef.current) {
      try {
        bufferSourceRef.current.stop(0);
      } catch {
        /* déjà stoppé */
      }
      bufferSourceRef.current = null;
    }
    bufferMetaRef.current = null;
  }, []);

  const ensureAudioGraph = useCallback(async (): Promise<AnalyserNode | null> => {
    if (!audioContextRef.current) {
      const MaybeWebkit = (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
      const Ctx =
        window.AudioContext ??
        (typeof MaybeWebkit === "function" ? (MaybeWebkit as typeof AudioContext) : undefined);
      if (!Ctx) {
        console.error("AudioContext indisponible dans ce navigateur");
        return null;
      }
      audioContextRef.current = new Ctx();
    }
    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch (err) {
        if (isRecoverablePlaybackError(err)) return null;
        throw err;
      }
    }
    if (!audioRef.current) {
      audioRef.current = new Audio();
      const elHook = audioRef.current;
      elHook.setAttribute("playsinline", "");
      elHook.setAttribute("webkit-playsinline", "");
      elHook.preload = "auto";
      elHook.crossOrigin = "anonymous";
      elHook.addEventListener("loadedmetadata", () => flushPlaybackSyncRef.current());
      elHook.addEventListener("play", () => schedulePlaybackSyncRafRef.current());
      elHook.addEventListener("pause", () => {
        cancelPlaybackSyncRafRef.current();
        flushPlaybackSyncRef.current();
      });
      elHook.addEventListener("ended", () => {
        cancelPlaybackSyncRafRef.current();
        flushPlaybackSyncRef.current();
      });
      const source = audioContextRef.current.createMediaElementSource(audioRef.current);
      const analyserNode = audioContextRef.current.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      source.connect(analyserNode);
      analyserNode.connect(audioContextRef.current.destination);
      (audioRef.current as unknown as { __analyser: AnalyserNode }).__analyser = analyserNode;
    }
    return (audioRef.current as unknown as { __analyser: AnalyserNode }).__analyser;
  }, []);

  const playHead = useCallback(async () => {
    const q = queueRef.current;
    if (!q.length || pausedByUserRef.current) {
      cancelPlaybackSyncRafRef.current();
      onPlaybackSyncRef.current?.(null);
      onActiveClipUrlChangeRef.current?.(null);
      setIsPlaying(false);
      setAnalyser(null);
      stopBufferPlayback();
      return;
    }

    const session = ++playSessionRef.current;
    const clip = q[0];
    onActiveClipUrlChangeRef.current?.(clip.url);

    const isStale = () => session !== playSessionRef.current;

    const finishClip = () => {
      if (session !== playSessionRef.current) return;
      setQueue((prev) => {
        const [done, ...rest] = prev;
        if (done) {
          localStorage.setItem(LS_UPLOAD_LAST_SEEN, done.createdAt);
          if (done.firestoreUpdatedAt) {
            localStorage.setItem("ai_last_listened_updated_at", done.firestoreUpdatedAt);
          }
        }
        queueRef.current = rest;
        return rest;
      });
      setAnalyser(null);
      stopBufferPlayback();
      if (!pausedByUserRef.current) {
        requestAnimationFrame(() => {
          void playHead();
        });
      } else {
        setIsPlaying(false);
      }
    };

    const tryPlayMediaElement = async (mediaEl: HTMLAudioElement): Promise<boolean> => {
      /* Laisse load()/réseau progresser ; jsdom n’émet souvent pas canplay (timeout → on tente play quand même). */
      await waitForCanPlay(mediaEl, 900);
      try {
        await mediaEl.play();
        return true;
      } catch (err) {
        if (isRecoverablePlaybackError(err)) return false;
        throw err;
      }
    };

    const playDecodedBuffer = async (ab: ArrayBuffer, syncClipUrl: string) => {
      const ctx = audioContextRef.current;
      if (!ctx) throw new Error("AudioContext indisponible");
      await ctx.resume();
      stopBufferPlayback();
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await ctx.decodeAudioData(ab.slice(0));
      } catch (e) {
        console.error("decodeAudioData:", e);
        throw e;
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      setAnalyser(analyserNode);
      bufferSourceRef.current = source;
      bufferMetaRef.current = {
        startCtxTime: ctx.currentTime,
        duration: audioBuffer.duration,
        clipUrl: syncClipUrl,
      };
      source.onended = () => {
        if (session !== playSessionRef.current) return;
        cancelPlaybackSyncRafRef.current();
        flushPlaybackSyncRef.current();
        finishClip();
      };
      source.start(0);
      schedulePlaybackSyncRafRef.current();
    };

    try {
      let effectiveUrl = clip.url;
      if (typeof window !== "undefined") {
        effectiveUrl = await resolveClipPublicUrl(clip.url);
        if (isStale() || !mountedRef.current) return;
        if (effectiveUrl !== clip.url) {
          setQueue((prev) => {
            const [h, ...t] = prev;
            if (!h || h.url !== clip.url) return prev;
            const next = [{ ...h, url: effectiveUrl }, ...t];
            queueRef.current = next;
            return next;
          });
        }
      }

      const node = await ensureAudioGraph();
      if (isStale() || !mountedRef.current) return;
      if (!node) {
        setIsPlaying(false);
        setAnalyser(null);
        return;
      }
      setAnalyser(node);

      const el = audioRef.current;
      if (!el) return;

      stopBufferPlayback();

      el.onended = () => {
        if (session !== playSessionRef.current) return;
        finishClip();
      };

      el.pause();
      const absResolved =
        typeof window !== "undefined"
          ? new URL(effectiveUrl, window.location.origin).href
          : effectiveUrl;

      if (el.src !== absResolved) {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        el.src = absResolved;
        el.load();
      } else if (el.ended) {
        el.currentTime = 0;
      }

      let fetched: ArrayBuffer | null = null;
      const ensureFetched = async () => {
        if (fetched) return fetched;
        const tryDownload = async (href: string) => {
          const res = await fetch(href, { cache: "no-store" });
          if (!res.ok) return null;
          return res.arrayBuffer();
        };

        let ab = await tryDownload(absResolved);
        if (!ab && typeof window !== "undefined") {
          for (const name of uploadPathCandidatesFromUrl(clip.url, window.location.origin)) {
            const res = await fetch(`/api/ai/resolve-audio-url?name=${encodeURIComponent(name)}`, {
              cache: "no-store",
            });
            if (!res.ok) continue;
            const j = (await res.json()) as { url?: string };
            if (!j?.url) continue;
            const nextAbs = new URL(j.url, window.location.origin).href;
            ab = await tryDownload(nextAbs);
            if (ab) break;
          }
        }
        if (!ab) throw new Error(`Téléchargement audio: 404`);
        fetched = ab;
        return fetched;
      };

      let played = await tryPlayMediaElement(el);
      if (!played) {
        const ab = await ensureFetched();
        const mime = mimeFromAudioUrl(effectiveUrl);
        const blob = new Blob([ab], { type: mime });
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        try {
          objectUrlRef.current = URL.createObjectURL(blob);
          el.src = objectUrlRef.current;
        } catch (e) {
          console.error("AiAssistant createObjectURL failed", e);
        }
        el.load();
        played = await tryPlayMediaElement(el);
      }

      if (!played) {
        const ab = await ensureFetched();
        el.pause();
        await playDecodedBuffer(ab, effectiveUrl);
        if (isStale() || !mountedRef.current) return;
        setIsPlaying(true);
        return;
      }

      if (isStale() || !mountedRef.current) return;
      setIsPlaying(true);
    } catch (e) {
      if (isStale() || !mountedRef.current) return;
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      if (isRecoverablePlaybackError(e)) {
        setIsPlaying(false);
        setAnalyser(null);
        stopBufferPlayback();
        return;
      }
      console.error("lecture audio:", e);
      setIsPlaying(false);
      setAnalyser(null);
      stopBufferPlayback();
      

      finishClip();
    }
  }, [ensureAudioGraph, stopBufferPlayback]);

  const startPlayback = useCallback(() => {
    pausedByUserRef.current = false;
    pendingPlayRef.current = false;
    const head = queueRef.current[0];
    onActiveClipUrlChangeRef.current?.(head?.url ?? null);
    onUserPressPlay?.();
    if (!queueRef.current.length) return;
    void playHead();
  }, [onUserPressPlay, playHead]);

  const stopPlayback = useCallback(() => {
    pausedByUserRef.current = true;
    playSessionRef.current += 1;
    cancelPlaybackSyncRaf();
    stopBufferPlayback();
    audioRef.current?.pause();
    setIsPlaying(false);
  }, [cancelPlaybackSyncRaf, stopBufferPlayback]);

  useEffect(() => {
    if (!db) return;

    const unsub = onSnapshot(doc(db, "ai_status", "macrodroid"), (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      if (!data?.audioUrl || data.updatedAt == null) return;

      const id = serializeFirestoreUpdatedAt(data.updatedAt);

      if (isFirstFirestoreSnapshot.current) {
        isFirstFirestoreSnapshot.current = false;
        sessionStorage.setItem("ai_last_listened_updated_at", id);
        return;
      }

      const last = sessionStorage.getItem("ai_last_listened_updated_at");
      if (id === last) return;

      sessionStorage.setItem("ai_last_listened_updated_at", id);

      const url = String(data.audioUrl);
      setQueue((prev) => {
        if (prev.some((c) => c.url === url)) return prev;
        const dupIdx = queueFindIndexByBasename(prev, url);
        if (dupIdx >= 0) {
          const next = [...prev];
          next[dupIdx] = {
            ...next[dupIdx],
            url,
            source: "firestore",
            firestoreUpdatedAt: id,
          };
          queueRef.current = next;
          return next;
        }
        const next = [
          ...prev,
          {
            url,
            createdAt: new Date().toISOString(),
            source: "firestore" as const,
            firestoreUpdatedAt: id,
          },
        ];
        queueRef.current = next;
        return next;
      });
      if (!pausedByUserRef.current && !isPlayingRef.current) {
        pendingPlayRef.current = true;
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/ai/audios");
        if (!res.ok || cancelled) return;
        const { audios } = (await res.json()) as AudiosPayload;
        const clips = audios
          .filter((a) => isPollableDiskAudioName(a.name))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (!diskInitRef.current) {
          diskInitRef.current = true;
          // En mode démo, on ignore tout ce qui existe déjà au démarrage
          if (clips.length) {
            sessionStorage.setItem(LS_UPLOAD_LAST_SEEN, clips[clips.length - 1].createdAt);
          } else {
            sessionStorage.setItem(LS_UPLOAD_LAST_SEEN, new Date().toISOString());
          }
          return;
        }

        const lastSeen = sessionStorage.getItem(LS_UPLOAD_LAST_SEEN);
        if (!lastSeen) return;

        const t = new Date(lastSeen).getTime();
        const fresh = clips.filter((a) => new Date(a.createdAt).getTime() > t);

        if (fresh.length) {
          setQueue((prev) => {
            let next = prev;
            for (const a of fresh) {
              if (next.some((c) => c.url === a.url)) continue;
              const dupIdx = queueFindIndexByBasename(next, a.url);
              if (dupIdx >= 0) {
                const existing = next[dupIdx];
                const pathDepth = (u: string) =>
                  new URL(u, "http://localhost").pathname.split("/").filter(Boolean).length;
                const incomingD = pathDepth(a.url);
                const existingD = pathDepth(existing.url);
                const preferIncoming =
                  incomingD > existingD ||
                  (incomingD === existingD &&
                    new Date(a.createdAt).getTime() > new Date(existing.createdAt).getTime());
                next = [...next];
                next[dupIdx] = {
                  ...existing,
                  url: preferIncoming ? a.url : existing.url,
                  createdAt: preferIncoming ? a.createdAt : existing.createdAt,
                  source: "disk",
                };
                continue;
              }
              next = [...next, { url: a.url, createdAt: a.createdAt, source: "disk" as const }];
            }
            queueRef.current = next;
            return next;
          });
          if (!pausedByUserRef.current && !isPlayingRef.current) {
            pendingPlayRef.current = true;
          }
        }
      } catch {
        /* ignore */
      }
    };

    const iv = setInterval(poll, 5000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    if (!diskInitRef.current) return;
    if (pendingPlayRef.current && queue.length && !isPlaying && !pausedByUserRef.current) {
      pendingPlayRef.current = false;
      void playHead();
    }
  }, [queue, isPlaying, playHead]);

  useEffect(() => {
    return () => {
      cancelPlaybackSyncRafRef.current();
      if (bufferSourceRef.current) {
        try {
          bufferSourceRef.current.stop(0);
        } catch {
          /* noop */
        }
        bufferSourceRef.current = null;
      }
      bufferMetaRef.current = null;
      audioRef.current?.pause();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      audioRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  const togglePlayback = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (isPlaying) stopPlayback();
    else startPlayback();
  };

  const queueLength = queue.length;
  const showBadge = queueLength > 0;
  
  const showTransportControl = queueLength > 0 || isPlaying || transcriptOverlayVisible;

  
  const mapPanelRect = useAiStripInsetRect();

  const stripInsetTotal = AI_STRIP_EDGE_INSET_PX * 2;
  const stripFallbackWidth = `calc(min(70vh, calc(100vw - 48px)) - ${stripInsetTotal}px)`;

  const stripPositionStyle: React.CSSProperties =
    mapPanelRect != null
      ? {
          left: mapPanelRect.left,
          width: mapPanelRect.width,
          minWidth: mapPanelRect.width,
          maxWidth: mapPanelRect.width,
          transform: "none",
        }
      : {
          left: "50%",
          width: stripFallbackWidth,
          minWidth: stripFallbackWidth,
          maxWidth: stripFallbackWidth,
          transform: "translateX(-50%)",
        };

  const isHidden = false; // Toujours visible pour assurer la continuité de la transcription sur toutes les pages

  return (
    <AnimatePresence>
      {!isHidden && (
        <motion.div
          data-testid="ai-assistant-strip"
          className="fixed bottom-10 z-[10000] box-border flex min-w-0 flex-col items-stretch"
          style={stripPositionStyle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20, pointerEvents: "none" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
      <div
        className={`relative h-14 w-full min-w-0 max-w-full shrink-0 transition-all duration-500 ease-out hover:scale-[1.02] ${showBadge ? "scale-[1.02]" : ""}`}
        onContextMenu={(e) => {
          e.preventDefault();
          onUserLongPress?.();
        }}
      >
        {showBadge ? (
          <div
            data-testid="ai-queue-badge"
            className="pointer-events-none absolute top-1/2 right-6 z-[6] -translate-y-1/2 text-sm font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
          >
            {queueLength}
          </div>
        ) : null}
        <GalaxyButton
          asInteractiveButton={false}
          className={`h-full w-full ${showBadge ? "notified" : ""}`}
        >
          <div className="pointer-events-none relative flex h-full w-full items-center justify-center">
            <Waveform color="white" barCount={12} analyser={analyser} />
          </div>
          <AnimatePresence initial={false}>
            {showTransportControl ? (
              <motion.div
                key="ai-assistant-transport"
                role="button"
                tabIndex={0}
                data-testid="ai-assistant-play-toggle"
                onClick={togglePlayback}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    togglePlayback(e);
                  }
                }}
                initial={{ opacity: 0, scale: 0.75, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.78, x: -8 }}
                transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.65 }}
                className="pointer-events-auto absolute top-1/2 left-3 z-[5] flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-white shadow-none outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label={isPlaying ? "Pause" : "Lecture"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isPlaying ? (
                    <motion.span
                      key="stop"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="flex items-center justify-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
                    >
                      <Square className="h-5 w-5 fill-current" strokeWidth={0} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="play"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="flex items-center justify-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
                    >
                      <Play className="h-6 w-6 fill-current" strokeWidth={0} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </GalaxyButton>
      </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
