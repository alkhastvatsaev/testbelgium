"use client";
import React, { useState } from 'react';
import { Truck, MapPin, CheckCircle, CreditCard, ChevronLeft, ScanFace } from 'lucide-react';
import Link from 'next/link';
import ARScanner from '@/features/technicians/components/ARScanner';
import TapToPayModal from '@/features/technicians/components/TapToPayModal';
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from '@/core/ui/glassPanelChrome';

export default function TechnicianView() {
  const [status, setStatus] = useState('available');
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    alert(`Statut mis à jour sur : ${newStatus}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col gap-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      {/* Modals */}
      {showScanner && <ARScanner onClose={() => setShowScanner(false)} />}
      {showPayment && <TapToPayModal onClose={() => setShowPayment(false)} amount="149,00" />}

      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <Link href="/" className="p-3 bg-white shadow-sm border border-slate-200 rounded-full text-slate-600 hover:text-slate-900 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="text-center">
          <h1 className="text-slate-900 text-xl font-bold tracking-tight">Alexandre V.</h1>
          <span className="text-blue-600 font-semibold text-xs uppercase tracking-widest">Camionnette #01</span>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/30">
          A
        </div>
      </header>

      {/* Current Intervention */}
      <div className="relative flex min-h-0 flex-col overflow-hidden rounded-[40px] border border-white bg-white/80 p-0 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        {/* AR Scan Button (Floating top right) */}
        <button 
          type="button"
          onClick={() => setShowScanner(true)}
          className="absolute right-4 top-4 z-10 rounded-full border border-emerald-100 bg-emerald-50 p-4 text-emerald-600 shadow-sm transition-transform active:scale-95"
        >
          <ScanFace className="w-6 h-6" />
        </button>

        <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-4`}>
          <div className="flex items-start justify-between pr-14">
            <div>
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Intervention Urgente</h2>
              <h3 className="text-2xl font-black text-slate-900">Porte Claquée</h3>
            </div>
          </div>

        <p className="mb-8 flex items-start gap-3 text-lg font-medium text-slate-600">
          <MapPin className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
          Mont des Arts, 1000 Bruxelles
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => handleStatusChange('en_route')}
            className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-lg transition-all ${status === 'en_route' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
          >
            <Truck className="w-6 h-6" />
            Je suis en route
          </button>

          <button 
            onClick={() => handleStatusChange('on_site')}
            className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-lg transition-all ${status === 'on_site' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
          >
            <MapPin className="w-6 h-6" />
            Arrivé sur place
          </button>

          <button 
            onClick={() => handleStatusChange('available')}
            className="flex items-center justify-center gap-3 w-full py-5 rounded-[24px] font-bold text-xl transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] mt-4"
          >
            <CheckCircle className="w-7 h-7" />
            Mission Terminée
          </button>
        </div>
        </div>
      </div>

      <div className="mt-auto">
        <button 
          onClick={() => setShowPayment(true)}
          className="flex items-center justify-between w-full p-8 bg-slate-900 rounded-[40px] shadow-2xl active:scale-95 transition-transform"
        >
          <div className="text-left">
            <h3 className="text-white font-bold text-2xl mb-1">Encaisser</h3>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Tap-to-Pay iPhone</p>
          </div>
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
        </button>
      </div>

    </div>
  );
}
