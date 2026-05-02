"use client";
import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, X } from 'lucide-react';

export default function TapToPayModal({ onClose, amount = "149,00" }: { onClose: () => void, amount?: string }) {
  const [phase, setPhase] = useState<'waiting' | 'processing' | 'success'>('waiting');

  useEffect(() => {
    if (phase === 'waiting') {
      // Simulate user tapping card after 3 seconds
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
      
      <div className="bg-white/90 w-full sm:w-[400px] h-[70vh] sm:h-[500px] rounded-t-[40px] sm:rounded-[40px] relative z-10 p-8 flex flex-col items-center justify-between border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-full duration-300 backdrop-blur-2xl">
        
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full absolute top-4 left-1/2 -translate-x-1/2 sm:hidden" />
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mt-6">
          <h2 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Montant à régler</h2>
          <div className="text-5xl font-black text-slate-900 tracking-tight">{amount} €</div>
        </div>

        <div className="flex-1 flex items-center justify-center relative w-full">
          {/* NFC Waves Animation */}
          {phase === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border border-blue-500/30 rounded-full absolute" style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              <div className="w-48 h-48 border border-blue-500/10 rounded-full absolute" style={{ animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) 0.2s infinite' }} />
            </div>
          )}

          {/* Center Icon */}
          <div className={`w-28 h-28 rounded-full flex items-center justify-center relative z-10 transition-all duration-500 ${
            phase === 'success' ? 'bg-emerald-600 text-white scale-110 shadow-[0_0_40px_rgba(16,185,129,0.3)]' :
            phase === 'processing' ? 'bg-blue-600 text-white scale-100 shadow-[0_0_30px_rgba(59,130,246,0.3)]' :
            'bg-slate-100 text-slate-400 scale-100'
          }`}>
            {phase === 'success' ? (
              <CheckCircle2 className="w-12 h-12" />
            ) : (
              <CreditCard className={`w-12 h-12 ${phase === 'processing' ? 'animate-bounce' : ''}`} />
            )}
          </div>
        </div>

        <div className="text-center w-full pb-6">
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
