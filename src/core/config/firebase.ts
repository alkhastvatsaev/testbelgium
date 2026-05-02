import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore, enableMultiTabIndexedDbPersistence, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const isConfigured = !!firebaseConfig.projectId;
console.log("Firebase config projectId:", firebaseConfig.projectId, "isConfigured:", isConfigured);

const app = isConfigured 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)) 
  : null;

// Ancienne base de données (gardée temporairement pour éviter de tout casser)
const db = app ? getDatabase(app) : null;

// Nouvelle base de données avec mode HORS-LIGNE (Firestore) et forçage du Long Polling pour Vercel/Node
const firestore = app ? initializeFirestore(app, {
  experimentalForceLongPolling: true,
}) : null;

// Authentification
const auth = app ? getAuth(app) : null;

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

export { app, db, firestore, auth, isConfigured };
