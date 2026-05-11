"use client";

import { useEffect, useState } from "react";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { storage } from "@/core/config/firebase";
import type { Intervention } from "@/features/interventions/types";

export function readAudioUrl(inv: unknown): string | null {
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

export function readAudioStoragePath(inv: unknown): string | null {
  if (!inv || typeof inv !== "object") return null;
  const anyInv = inv as Record<string, unknown>;
  const candidates = [anyInv.audioStoragePath, anyInv.audio_storage_path, anyInv.voiceStoragePath];
  const hit = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return typeof hit === "string" ? hit : null;
}


export function useResolvedInterventionAudio(inv: Intervention | null | undefined) {
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);
  const [isResolvingAudio, setIsResolvingAudio] = useState(false);
  const [audioStorageResolveFailed, setAudioStorageResolveFailed] = useState(false);

  useEffect(() => {
    setResolvedAudioUrl(null);
    setIsResolvingAudio(false);
    setAudioStorageResolveFailed(false);
    if (!inv) return;
    let direct = readAudioUrl(inv);

    if (
      direct &&
      direct.startsWith("/api/demo/") &&
      typeof window !== "undefined" &&
      !window.location.hostname.includes("localhost") &&
      !window.location.hostname.includes("127.0.0.1")
    ) {
      direct = null;
    }
    if (direct) {
      setResolvedAudioUrl(direct);
      return;
    }
    const path = readAudioStoragePath(inv);
    if (!path || !storage) return;
    let cancelled = false;
    setIsResolvingAudio(true);
    void getDownloadURL(storageRef(storage, path))
      .then((url) => {
        if (!cancelled) setResolvedAudioUrl(url);
      })
      .catch((err) => {
        console.warn("Back-office: impossible de résoudre l'audio Storage", err);
        if (!cancelled) setAudioStorageResolveFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsResolvingAudio(false);
      });
    return () => {
      cancelled = true;
      setIsResolvingAudio(false);
    };
  }, [inv]);

  return { resolvedAudioUrl, isResolvingAudio, audioStorageResolveFailed };
}
