"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { auth, firestore, isConfigured } from '@/core/config/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

import { toast } from 'sonner';

import { syncClientPortalProfile } from '@/features/auth/clientPortalProfile';
import { devUiPreviewEnabled } from '@/core/config/devUiPreview';

export default function LoginOverlay({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<'checking' | 'ready'>('checking');
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  useEffect(() => {
    console.log("[LoginOverlay] Auto-access mode enabled");

    if (devUiPreviewEnabled) {
      setIsAuthenticated(true);
      setLoadingState('ready');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth!, async (user) => {
      if (user) {
        console.log("[LoginOverlay] User detected:", user.uid);
        try {
          await syncClientPortalProfile(user);
        } catch (e) {
          console.error("[LoginOverlay] sync error", e);
        }
        setIsAuthenticated(true);
        setLoadingState('ready');
      } else {
        console.log("[LoginOverlay] No user, signing in anonymously...");
        try {
          const cred = await signInAnonymously(auth!);
          await syncClientPortalProfile(cred.user);
          setIsAuthenticated(true);
          setLoadingState('ready');
        } catch (e) {
          console.error("[LoginOverlay] Anonymous sign-in failed", e);
          // If anonymous fails (e.g. offline), we still let them in for the demo UI
          setIsAuthenticated(true);
          setLoadingState('ready');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (loadingState === 'checking') {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" strokeWidth={1.5} />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Initialisation du Centre de Dispatch...</p>
      </div>
    );
  }

  // En mode démo "ouverture directe", on ne montre plus d'overlay de connexion.
  // L'authentification se fait silencieusement en arrière-plan.
  return <>{children}</>;
}
