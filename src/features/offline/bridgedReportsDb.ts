import { openDB, type IDBPDatabase } from "idb";

import type { BridgedTechnicianReport } from "@/context/TechnicianBackofficeReportBridgeContext";

const DB_NAME = "bm-bridged-reports-v1";
const STORE = "bridged-reports";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof window === "undefined") {
    throw new Error("[bridgedReportsDb] IndexedDB requiert un navigateur");
  }
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "localId" });
      }
    },
  });
  return dbPromise;
}

export async function bridgedReportsPut(record: BridgedTechnicianReport): Promise<void> {
  const db = await getDb();
  await db.put(STORE, record);
}

export async function bridgedReportsDelete(localId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, localId);
}

export async function bridgedReportsGetAll(): Promise<BridgedTechnicianReport[]> {
  const db = await getDb();
  return db.getAll(STORE);
}

