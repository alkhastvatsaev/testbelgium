import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      console.warn('Firebase Admin variables missing - some server-side features may be disabled.');
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

// Export a function or a getter to avoid crashing at build time
export const getAdminDb = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin not initialized. Check your environment variables.');
  }
  return admin.firestore();
};

// Legacy export for compatibility, but safe-guarded
export const adminDb = admin.apps.length ? admin.firestore() : null as unknown as admin.firestore.Firestore;
