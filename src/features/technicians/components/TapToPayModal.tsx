"use client";
import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, X } from 'lucide-react';
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from '@/core/ui/glassPanelChrome';

export default function TapToPayModal({ onClose, amount = "149,00" }: { onClose: () => void, amount?: string }) {
  const [phase, setPhase] = useState<'waiting' | 'processing' | 'success'>('waiting');

  useEffect(() => {
    if (phase === 'waiting') {

      const timer = setTimeout(() => setPhase('processing'), 3000);
      return () => clearTimeout(timer);
    } else if (phase === 'processing') {
      const timer = setTimeout(() => setPhase('success'), 2000);
      return () => clearTimeout(timer);
    } else if (phase === 'success') {
      const timer = setTimeout(() => onClose(), 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center font-['Outfit'] sm:items-center">
      <div className="absolute inset-0 bg-slate-200/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative z-10 flex h-[70vh] min-h-0 w-full max-w-full flex-col overflow-hidden rounded-t-[40px] border border-white bg-white/90 backdrop-blur-2xl animate-in slide-in-from-bottom-full duration-300 sm:h-[500px] sm:w-[400px] sm:rounded-[40px] sm:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]">
        
        {/* Drag handle */}
        <div className="absolute left-1/2 top-4 h-1.5 w-12 -translate-x-1/2 rounded-full bg-slate-200 sm:hidden" />
        
        <button type="button" onClick={onClose} className="absolute right-6 top-6 z-20 rounded-full bg-slate-100 p-2 text-slate-400 transition-colors hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="shrink-0 px-8 pb-2 pt-14 text-center">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Montant à régler</h2>
          <div className="text-5xl font-black tracking-tight text-slate-900">{amount} €</div>
        </div>

        <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} relative flex flex-col items-center justify-center`}>
          {/* NFC Waves Animation */}
          {phase === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border border-blue-500/30 rounded-full absolute" style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              <div className="w-48 h-48 border border-blue-500/10 rounded-full absolute" style={{ animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) 0.2s infinite' }} />
            </div>
          )}

          {/* Center Icon */}
          <div className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full transition-all duration-500 ${
            phase === 'success' ? 'scale-110 bg-emerald-600 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)]' :
            phase === 'processing' ? 'scale-100 bg-blue-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.3)]' :
            'scale-100 bg-slate-100 text-slate-400'
          }`}>
            {phase === 'success' ? (
              <CheckCircle2 className="w-12 h-12" />
            ) : (
              <CreditCard className={`w-12 h-12 ${phase === 'processing' ? 'animate-bounce' : ''}`} />
            )}
          </div>
        </div>

        <div className="w-full shrink-0 px-8 pb-8 text-center">
          <div className="text-xl font-bold text-slate-900 mb-2">
            {phase === 'waiting' && "Approchez la carte"}
            {phase === 'processing' && "Traitement..."}
            {phase === 'success' && "Succès !"}
          </div>
          <div className="text-slate-500 text-sm font-medium">
            {phase === 'waiting' && "Maintenez la carte sur le dos du terminal"}
            {phase === 'success' && "Le reçu a été envoyé par email."}
          </div>
        </div>
        
      </div>
    </div>
  );
}
