"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Phone, KeyRound, Loader2, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { auth, firestore } from '@/core/config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function LoginOverlay({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<'checking' | 'ready' | 'authenticating'>('checking');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("[LoginOverlay] Mount");
    
    // 0. Récupérer le numéro sauvegardé si existant
    if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem('saved_phone');
      if (savedPhone) setPhoneNumber(savedPhone);
    }

    // 1. Vérification IP en premier
    const checkIpAndAuth = async () => {
      console.log("[LoginOverlay] checkIpAndAuth start");
      try {
        const ipRes = await fetch('/api/auth/ip');
        const ipData = await ipRes.json();
        const officeIp = process.env.NEXT_PUBLIC_OFFICE_IP;

        console.log("[LoginOverlay] IP Data:", ipData, "Office IP:", officeIp);

        if (officeIp && ipData.ip === officeIp) {
          console.log("[LoginOverlay] Office IP match, auto-authenticating");
          toast.success("Authentification automatique", { description: "Connexion Bureau détectée." });
          setIsAuthenticated(true);
          setLoadingState('ready');
          return;
        }
      } catch (e) {
        console.error("[LoginOverlay] Erreur check IP", e);
      }

      console.log("[LoginOverlay] Checking Firebase Auth...");
      // 2. Si pas IP bureau, on vérifie l'état Firebase Auth
      if (!auth) {
        console.warn("[LoginOverlay] Firebase auth object is missing!");
        setLoadingState('ready');
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log("[LoginOverlay] onAuthStateChanged fired, user:", !!user);
        if (user && user.phoneNumber && firestore) {
          // Vérifier la Whitelist Firestore
          try {
            console.log("[LoginOverlay] Checking whitelist for:", user.phoneNumber);
            const userDoc = await getDoc(doc(firestore, 'allowed_users', user.phoneNumber));
            if (userDoc.exists()) {
              console.log("[LoginOverlay] User is allowed");
              setIsAuthenticated(true);
            } else {
              console.log("[LoginOverlay] User not allowed");
              await signOut(auth!);
              toast.error("Accès refusé", { description: "Votre numéro n'est pas autorisé." });
            }
          } catch (e) {
            console.error("Erreur vérification whitelist", e);
            await signOut(auth!);
          }
        } else {
          console.log("[LoginOverlay] No user or phone number");
          setIsAuthenticated(false);
        }
        console.log("[LoginOverlay] Setting ready from onAuthStateChanged");
        setLoadingState('ready');
      });

      return unsubscribe;
    };

    // Timeout de sécurité pour éviter de rester bloqué sur le chargement
    // On réduit à 2.5s pour une meilleure réactivité
    const timeout = setTimeout(() => {
      console.log("[LoginOverlay] Safety timeout fired. Forcing ready state.");
      setLoadingState('ready');
    }, 2500);

    let unsubscribeFunc: (() => void) | undefined;
    checkIpAndAuth().catch(err => {
      console.error("[LoginOverlay] Critical error in checkIpAndAuth:", err);
      setLoadingState('ready');
    }).then(unsub => {
      if (unsub) unsubscribeFunc = unsub;
    });

    return () => {
      console.log("[LoginOverlay] Unmount cleanup");
      clearTimeout(timeout);
      if (unsubscribeFunc) unsubscribeFunc();
    };
  }, []);

  const setupRecaptcha = () => {
    if (!auth || !recaptchaContainerRef.current) return null;
    
    // Clear any existing recaptcha
    if ((window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier.clear();
    }

    try {
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });
      (window as any).recaptchaVerifier = verifier;
      return verifier;
    } catch (e) {
      console.error("Erreur Recaptcha", e);
      return null;
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Tentative d'envoi SMS. auth:", !!auth, "phone:", phoneNumber);
    
    if (!phoneNumber) {
      toast.error("Veuillez entrer un numéro de téléphone.");
      return;
    }
    if (!auth) {
      toast.error("Erreur critique: Auth Firebase non initialisé.");
      return;
    }

    setLoadingState('authenticating');
    // Nettoyage complet : on supprime tous les espaces
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+32${cleanPhone.replace(/^0/, '')}`;
    console.log("Numéro formaté:", formattedPhone);
    
    try {
      const verifier = setupRecaptcha();
      if (!verifier) throw new Error("Recaptcha non initialisé");

      console.log("Appel de signInWithPhoneNumber...");
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      console.log("SMS envoyé avec succès !");
      setConfirmationResult(confirmation);
      setStep('otp');
      toast.success("SMS Envoyé", { description: "Veuillez entrer le code reçu." });
    } catch (error: any) {
      console.error("Erreur détaillée SMS:", error);
      toast.error("Erreur SMS", { description: error.message || "Vérifiez la console pour plus de détails." });
      
      // Réinitialiser le recaptcha en cas d'erreur
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
      }
    } finally {
      setLoadingState('ready');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !confirmationResult || !firestore || !auth) return;

    setLoadingState('authenticating');

    try {
      const result = await confirmationResult.confirm(otpCode.trim());
      const user = result.user;

      if (user && user.phoneNumber) {
        // Vérification Whitelist
        console.log("Code valide ! Utilisateur:", user.phoneNumber);
        const userDoc = await getDoc(doc(firestore, 'allowed_users', user.phoneNumber));
        
        if (userDoc.exists()) {
          console.log("Utilisateur trouvé dans la whitelist !");
          
          const userData = userDoc.data();
          const userName = userData?.name;

          // Sauvegarder le numéro uniquement après un succès complet
          if (typeof window !== 'undefined') {
            localStorage.setItem('saved_phone', user.phoneNumber);
          }

          setIsAuthenticated(true);
          
          if (userName) {
            toast.success("Accès autorisé", { description: `Bienvenue ${userName} !` });
          } else {
            toast.success("Accès autorisé", { description: "Bienvenue dans le centre de dispatch." });
          }
        } else {
          console.warn("Utilisateur NON trouvé dans la whitelist.");
          await signOut(auth!);
          toast.error("Accès refusé", { description: "Numéro non reconnu dans la base de données Firestore." });
          setStep('phone');
          setOtpCode('');
        }
      }
    } catch (error: any) {
      console.error("Erreur confirmation OTP:", error);
      toast.error("Code invalide", { description: `Erreur Firebase: ${error.code || error.message}` });
    } finally {
      setLoadingState('ready');
    }
  };

  if (loadingState === 'checking') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="relative h-9 w-9 animate-spin text-slate-500" strokeWidth={1.5} aria-label="Chargement" />
      </div>
    );
  }

  return (
    <>
      {children}

      <AnimatePresence>
        {!isAuthenticated && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-100/40 backdrop-blur-md"
          >
            {/* Conteneur invisible pour Recaptcha */}
            <div id="recaptcha-container" ref={recaptchaContainerRef}></div>

            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white/70 border border-white/40 p-8 rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] max-w-md w-full mx-4 backdrop-blur-2xl relative overflow-hidden"
            >
              {/* Effet lumineux */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
              
              {/* Espacement ajusté en l'absence de logo */}
              <div className="pt-2"></div>

              {step === 'phone' ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <button
                    type="button"
                    data-testid="login-dev-access-btn"
                    onClick={() => {
                      toast.success("Mode développeur activé");
                      setIsAuthenticated(true);
                    }}
                    className="w-1/3 bg-black hover:bg-slate-800 text-white font-bold text-sm py-2 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                  >
                    DEV ACCESS
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                  <div className="flex flex-col items-center w-full">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 block text-center w-full">
                      Code de Vérification
                    </label>
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="w-5 h-5 text-slate-500" />
                      </div>
                      <input 
                        type="text" 
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all tracking-[0.5em] font-mono text-center text-lg shadow-inner"
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={loadingState === 'authenticating' || otpCode.length < 6}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {loadingState === 'authenticating' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Déverrouiller'}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-xs text-slate-500 hover:text-slate-800 transition-colors mt-2"
                  >
                    Retour au numéro
                  </button>
                </form>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
