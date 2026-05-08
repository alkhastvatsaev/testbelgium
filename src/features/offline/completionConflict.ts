import type { Timestamp } from "firebase/firestore";

/** Conflit : le serveur a déjà une complétion plus récente que notre file locale → ne pas écraser. */
export function remoteCompletionIsNewerThanQueued(
  remoteStatus: string | undefined,
  remoteCompletedAt: Timestamp | { toMillis?: () => number } | Date | undefined | null,
  queuedAtMs: number,
): boolean {
  if (remoteStatus !== "done" && remoteStatus !== "invoiced") return false;
  if (!remoteCompletedAt) return false;

  let remoteMs = 0;
  if (typeof remoteCompletedAt === "object" && remoteCompletedAt !== null && "toMillis" in remoteCompletedAt) {
    remoteMs = typeof remoteCompletedAt.toMillis === "function" ? remoteCompletedAt.toMillis() : 0;
  } else if (remoteCompletedAt instanceof Date) {
    remoteMs = remoteCompletedAt.getTime();
  }

  return remoteMs > queuedAtMs;
}
