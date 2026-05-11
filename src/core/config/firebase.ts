import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, enableMultiTabIndexedDbPersistence, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

/** RTDB uniquement si URL explicite : sans elle, `getDatabase(app)` peut lever au build SSR (Vercel) si la RTDB n’existe pas / URL dérivée invalide. */
function readOptionalRealtimeDatabaseUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return undefined;
    return raw;
  } catch {
    return undefined;
  }
}

const realtimeDatabaseUrl = readOptionalRealtimeDatabaseUrl();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ...(realtimeDatabaseUrl ? { databaseURL: realtimeDatabaseUrl } : {}),
};

const isConfigured = !!firebaseConfig.projectId;

const app = isConfigured 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)) 
  : null;

// Ancienne Realtime Database — projet basé sur Firestore uniquement : laisser `null` sans NEXT_PUBLIC_FIREBASE_DATABASE_URL.
const db: Database | null =
  app && realtimeDatabaseUrl ? getDatabase(app) : null;

// Nouvelle base de données avec mode HORS-LIGNE (Firestore) et forçage du Long Polling pour Vercel/Node
const firestore = app ? initializeFirestore(app, {
  experimentalForceLongPolling: true,
}) : null;

// Authentification + fichiers (photos fin d’intervention)
const auth = app ? getAuth(app) : null;
const storage = app ? getStorage(app) : null;

// Activer le cache hors-ligne uniquement côté client (navigateur)
if (typeof window !== 'undefined' && firestore) {
  enableMultiTabIndexedDbPersistence(firestore).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Le mode hors-ligne ne peut être activé que sur un seul onglet à la fois.");
    } else if (err.code === 'unimplemented') {
      console.warn("Le navigateur actuel ne supporte pas le mode hors-ligne de Firebase.");
    }
  });
}

export { app, db, firestore, auth, storage, isConfigured };
