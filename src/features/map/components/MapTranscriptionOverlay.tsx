'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { AiPlaybackSync } from '@/features/dispatch/components/AiAssistant';

export const TRANSCRIPT_REVEAL_MS_PER_CHAR = 18;
/** Pas d’animation pour la révélation timer : un mot (ou un chunk de caractères si un seul token) à chaque pas. */
export const TRANSCRIPT_REVEAL_CHUNK_CHARS = 3;
export const TRANSCRIPT_POLL_MS =
  Number(process.env.NEXT_PUBLIC_TRANSCRIPT_POLL_MS) > 0
    ? Number(process.env.NEXT_PUBLIC_TRANSCRIPT_POLL_MS)
    : 3000;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Index dans `text` juste après le n-ième mot (espaces exclus du compte). */
export function endIndexAfterWordCount(text: string, wordCount: number): number {
  if (wordCount <= 0 || !text) return 0;
  let seen = 0;
  let i = 0;
  const len = text.length;
  while (i < len) {
    while (i < len && /\s/.test(text[i]!)) i++;
    if (i >= len) break;
    seen++;
    while (i < len && !/\s/.test(text[i]!)) i++;
    if (seen >= wordCount) return i;
  }
  return len;
}

/** Fin du segment à afficher, synchronisée sur `currentTime` / `duration` (mots si >1 mot, sinon caractères). */
export function audioSyncedEndIndex(text: string, currentTime: number, duration: number): number {
  if (!text || duration <= 0) return 0;
  const p = Math.min(1, Math.max(0, currentTime / duration));
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  if (words.length === 1) {
    return Math.min(text.length, Math.floor(text.length * p));
  }
  const n = Math.min(words.length, Math.floor(p * words.length));
  return endIndexAfterWordCount(text, n);
}

type AudiosResponse = {
  audio:
    | null
    | {
        name: string;
        url: string;
        createdAt: string;
        transcript: string | null;
        meta?: unknown;
      };
  decision: { status: "none" | "refused" | "created"; updatedAt: string | null };
};

function normalizeAudioUrl(url: string): string {
  if (typeof window === 'undefined') return url.trim();
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url.trim();
  }
}

type Props = {
  /** La transcription ne se charge et ne s’affiche qu’après l’appui sur lecture (Galaxy) */
  armed: boolean;
  /**
   * Incrémenté à chaque appui sur lecture (ex. `openEditSignal` côté carte) : ouvre tout de suite
   * le calque (assombrissement) avant la réponse `/api/ai/latest-audio`.
   */
  playOpenSignal?: number;
  /** Contrôlé par la carte : seul un appui sur le bouton lecture Galaxy le passe à `true` (pas l’auto-play). */
  transcriptTextEnabled?: boolean;
  /** Quand l’URL du clip correspond au transcript affiché et duration > 0, la révélation suit currentTime / duration */
  playbackSync?: AiPlaybackSync;
  /** Notifie si le calque transcription (texte + assombrissement) est affiché — ex. pour garder le bouton Play jusqu’à la croix */
  onVisibleChange?: (visible: boolean) => void;
  /** Si défini : n’utiliser que ce clip (URL /uploads/…), pas le « dernier fichier » disque — aligné sur la file Galaxy. */
  scopedClipPublicUrl?: string | null;
  /** Force l'affichage du calque (assombrissement et croix) même sans texte ou signal de lecture. */
  forceVisible?: boolean;
};

function MapTranscriptionOverlayInner({
  armed,
  playOpenSignal = 0,
  transcriptTextEnabled = false,
  playbackSync = null,
  scopedClipPublicUrl,
  onVisibleChange,
  forceVisible = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [fullText, setFullText] = useState('');
  const [transcriptSourceUrl, setTranscriptSourceUrl] = useState('');
  /**
   * Bloque la révélation pilotée par l’audio tant que la lecture n’a pas « repris » pour cette transcription.
   * Sinon un `playbackSync` encore en fin de piste (currentTime ≈ duration) sur la même URL applique
   * un ratio 1 au **nouveau** texte → flash de tout le texte, puis vide au passage en mode timer.
   */
  const [audioRevealBlocked, setAudioRevealBlocked] = useState(true);
  const [fallbackRevealedLen, setFallbackRevealedLen] = useState(0);
  /** Révélation sans audio multi-mots : nombre de mots affichés (1 pas = 1 mot). */
  const [fallbackRevealedWordCount, setFallbackRevealedWordCount] = useState(0);
  const closedForSessionRef = useRef<string | null>(null);
  /** Session audio = même fichier reçu ; le texte peut encore être affiné sans changer d’enregistrement. */
  const currentSessionKeyRef = useRef<string>('');
  const lastTranscriptInSessionRef = useRef<string>('');
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hadAudioSyncRef = useRef(false);
  const lastSyncRatioRef = useRef(0);
  const skipTimerAfterFullAudioRef = useRef(false);
  const freezePartialAfterAudioRef = useRef(false);

  const stopReveal = useCallback(() => {
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const audioSyncActive = Boolean(
    playbackSync &&
      transcriptSourceUrl &&
      normalizeAudioUrl(playbackSync.clipUrl) === normalizeAudioUrl(transcriptSourceUrl) &&
      playbackSync.duration > 0 &&
      !audioRevealBlocked
  );

  useEffect(() => {
    if (!playbackSync || !transcriptSourceUrl) return;
    if (normalizeAudioUrl(playbackSync.clipUrl) !== normalizeAudioUrl(transcriptSourceUrl)) return;
    if (playbackSync.duration <= 0) return;
    const nearStart =
      playbackSync.currentTime < playbackSync.duration * 0.06 &&
      playbackSync.currentTime < playbackSync.duration - 0.2;
    if (playbackSync.playing || nearStart) setAudioRevealBlocked(false);
  }, [playbackSync, transcriptSourceUrl]);

  const audioDrivenEndIndex =
    audioSyncActive && playbackSync
      ? audioSyncedEndIndex(fullText, playbackSync.currentTime, playbackSync.duration)
      : 0;

  useEffect(() => {
    if (audioSyncActive) hadAudioSyncRef.current = true;
  }, [audioSyncActive]);

  useEffect(() => {
    if (playbackSync && audioSyncActive && playbackSync.duration > 0) {
      lastSyncRatioRef.current = Math.min(
        1,
        Math.max(0, playbackSync.currentTime / playbackSync.duration)
      );
    }
  }, [playbackSync, audioSyncActive]);

  useEffect(() => {
    if (playbackSync !== null) return;
    if (!hadAudioSyncRef.current || !fullText) return;
    hadAudioSyncRef.current = false;
    const ratio = lastSyncRatioRef.current;
    lastSyncRatioRef.current = 0;
    const tw = countWords(fullText);
    if (tw <= 1) {
      const len = Math.min(fullText.length, Math.floor(fullText.length * Math.min(1, ratio)));
      setFallbackRevealedLen(len);
    } else {
      const wc = Math.min(tw, Math.floor(ratio * tw));
      setFallbackRevealedWordCount(wc);
    }
    if (ratio >= 0.995) skipTimerAfterFullAudioRef.current = true;
    else if (ratio > 0) freezePartialAfterAudioRef.current = true;
  }, [playbackSync, fullText]);

  useEffect(() => () => stopReveal(), [stopReveal]);

  useEffect(() => {
    onVisibleChange?.(visible);
  }, [visible, onVisibleChange]);

  /** Ouverture immédiate à chaque appui sur lecture (même si la transcription arrive plus tard) ou si forceVisible est vrai. */
  useEffect(() => {
    if (!armed) return;
    if (!playOpenSignal && !forceVisible && !fullText) return;
    setVisible(true);
    closedForSessionRef.current = null;
  }, [armed, playOpenSignal, forceVisible, fullText]);

  useEffect(() => {
    if (!armed || !visible || !fullText || !transcriptTextEnabled) {
      stopReveal();
      return;
    }
    if (audioSyncActive) {
      stopReveal();
      return;
    }
    if (skipTimerAfterFullAudioRef.current) {
      skipTimerAfterFullAudioRef.current = false;
      stopReveal();
      return;
    }
    if (freezePartialAfterAudioRef.current) {
      freezePartialAfterAudioRef.current = false;
      stopReveal();
      return;
    }

    stopReveal();
    setFallbackRevealedLen(0);
    setFallbackRevealedWordCount(0);
    const tw = countWords(fullText);
    revealTimerRef.current = setInterval(() => {
      if (tw <= 1) {
        setFallbackRevealedLen((prev) => {
          const next = Math.min(fullText.length, prev + TRANSCRIPT_REVEAL_CHUNK_CHARS);
          if (next >= fullText.length && revealTimerRef.current) {
            clearInterval(revealTimerRef.current);
            revealTimerRef.current = null;
          }
          return next;
        });
      } else {
        setFallbackRevealedWordCount((prev) => {
          const next = Math.min(tw, prev + 1);
          if (next >= tw && revealTimerRef.current) {
            clearInterval(revealTimerRef.current);
            revealTimerRef.current = null;
          }
          return next;
        });
      }
    }, TRANSCRIPT_REVEAL_MS_PER_CHAR);

    return () => stopReveal();
  }, [armed, visible, fullText, transcriptTextEnabled, audioSyncActive, stopReveal]);

  /** File Galaxy : pas d’URL de clip → ne pas afficher le « dernier » fichier disque par erreur. */
  useEffect(() => {
    if (!armed || scopedClipPublicUrl === undefined) return;
    const s = scopedClipPublicUrl?.trim() ?? "";
    if (s) return;
    currentSessionKeyRef.current = "";
    lastTranscriptInSessionRef.current = "";
    setFullText("");
    setTranscriptSourceUrl("");
    setAudioRevealBlocked(true);
    setFallbackRevealedLen(0);
    setFallbackRevealedWordCount(0);
    hadAudioSyncRef.current = false;
    lastSyncRatioRef.current = 0;
    skipTimerAfterFullAudioRef.current = false;
    freezePartialAfterAudioRef.current = false;
    stopReveal();
  }, [armed, scopedClipPublicUrl, stopReveal]);

  useEffect(() => {
    if (!armed) {
      currentSessionKeyRef.current = '';
      lastTranscriptInSessionRef.current = '';
      setVisible(false);
      setFullText('');
      setTranscriptSourceUrl('');
      setAudioRevealBlocked(true);
      setFallbackRevealedLen(0);
      setFallbackRevealedWordCount(0);
      hadAudioSyncRef.current = false;
      lastSyncRatioRef.current = 0;
      skipTimerAfterFullAudioRef.current = false;
      freezePartialAfterAudioRef.current = false;
      stopReveal();
      return;
    }

    const useScoped = scopedClipPublicUrl !== undefined;
    const scoped = scopedClipPublicUrl?.trim() ?? "";

    let cancelled = false;

    const tick = async () => {
      try {
        if (useScoped && !scoped) return;

        const endpoint = useScoped
          ? `/api/ai/audio-for-url?url=${encodeURIComponent(scoped)}`
          : "/api/ai/latest-audio";

        const res = await fetch(endpoint);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as AudiosResponse;
        if (data?.decision?.status === "refused" || data?.decision?.status === "created") {
          setVisible(false);
          return;
        }
        const latest = data.audio;
        if (!latest?.transcript?.trim()) return;

        const sessionKey = `${latest.url}:${latest.createdAt}`;
        const trimmed = latest.transcript.trim();

        if (closedForSessionRef.current === sessionKey) {
          if (trimmed !== lastTranscriptInSessionRef.current) {
            lastTranscriptInSessionRef.current = trimmed;
            setFullText(trimmed);
          }
          return;
        }

        if (sessionKey === currentSessionKeyRef.current) {
          if (trimmed === lastTranscriptInSessionRef.current) return;
          const prevText = lastTranscriptInSessionRef.current;
          lastTranscriptInSessionRef.current = trimmed;
          setFullText(trimmed);
          if (trimmed.length < prevText.length) {
            setFallbackRevealedLen(0);
            setFallbackRevealedWordCount(0);
          }
          return;
        }

        if (!cancelled) {
          currentSessionKeyRef.current = sessionKey;
          lastTranscriptInSessionRef.current = trimmed;
          setTranscriptSourceUrl(latest.url);
          setFullText(trimmed);
          setAudioRevealBlocked(true);
          setFallbackRevealedLen(0);
          setFallbackRevealedWordCount(0);
          hadAudioSyncRef.current = false;
          lastSyncRatioRef.current = 0;
          skipTimerAfterFullAudioRef.current = false;
          freezePartialAfterAudioRef.current = false;
        }
      } catch {
        /* ignore */
      }
    };

    tick();
    const id = setInterval(tick, TRANSCRIPT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [armed, stopReveal, scopedClipPublicUrl]);

  const handleClose = () => {
    closedForSessionRef.current = currentSessionKeyRef.current || null;
    setVisible(false);
    stopReveal();
  };

  if (!visible) return null;

  const tw = countWords(fullText);
  const fallbackDisplayedEnd =
    !fullText.length
      ? 0
      : tw <= 1
        ? fallbackRevealedLen
        : endIndexAfterWordCount(fullText, fallbackRevealedWordCount);

  const shownLen = fullText.length
    ? audioSyncActive
      ? Math.max(audioDrivenEndIndex, fallbackDisplayedEnd)
      : fallbackDisplayedEnd
    : 0;
  const shown = fullText.slice(0, shownLen);

  return (
    <>
      {/* Transcription Scrim : Assombrissement de la carte derrière le texte */}
      <div
        data-testid="map-transcription-dim"
        className="pointer-events-none fixed inset-0 z-[9990] bg-gradient-to-b from-black/0 via-black/35 to-black/75 transition-opacity duration-200"
      />

      {/* Bouton fermeture en haut à droite de la carte */}
      <div className="pointer-events-none fixed top-3 right-3 z-[9999]">
        <button
          type="button"
          data-testid="map-transcription-close"
          onClick={handleClose}
          className="pointer-events-auto relative p-2 text-white transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label="Fermer la transcription"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2 z-0 rounded-full bg-black/40 blur-md opacity-80"
          />
          <X className="relative z-10 h-5 w-5 text-white opacity-100" strokeWidth={2.6} />
        </button>
      </div>

      {/* Texte directement sur la carte */}
      <div
        data-testid="map-transcription-overlay"
        className="pointer-events-none fixed inset-x-0 bottom-10 z-[9999] flex min-h-[3rem] justify-center px-6"
      >
        {transcriptTextEnabled && fullText.trim() ? (
          <div
            data-testid="map-transcription-text"
            className="max-w-[min(92vw,820px)] whitespace-pre-wrap text-center text-2xl font-extrabold leading-snug tracking-tight text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.75)]"
            style={{
              contain: 'layout style',
            }}
          >
            {shown}
          </div>
        ) : transcriptTextEnabled ? (
          <div
            data-testid="map-transcription-loading"
            className="max-w-[min(92vw,820px)] text-center text-lg font-semibold text-white/90 drop-shadow-[0_3px_18px_rgba(0,0,0,0.75)]"
          >
            Transcription…
          </div>
        ) : null}
      </div>
    </>
  );
}

export default React.memo(MapTranscriptionOverlayInner);
