"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "belgmap_map_archived_missions_v1";

function loadKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistKeys(next: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    /* quota / private mode */
  }
}

/** Missions masquées sur la carte (page 1) — persistance locale par navigateur. */
export function useMapArchivedMissions() {
  const [archivedKeys, setArchivedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setArchivedKeys(loadKeys());
  }, []);

  const archiveKey = useCallback((key: string) => {
    setArchivedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      persistKeys(next);
      return next;
    });
  }, []);

  return { archivedKeys, archiveKey };
}
