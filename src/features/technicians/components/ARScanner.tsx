"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, ScanFace, CheckCircle2 } from 'lucide-react';

export default function ARScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'init' | 'scanning' | 'analyzing' | 'success'>('init');
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCamera(true);
          setTimeout(() => setPhase('scanning'), 1000);
        }
      } catch (err) {
        console.warn("Camera access denied or unavailable", err);
        // Fallback simulation mode
        setHasCamera(false);
        setTimeout(() => setPhase('scanning'), 1000);
      }
    }
    
    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (phase === 'scanning') {
      setTimeout(() => setPhase('analyzing'), 3000);
    } else if (phase === 'analyzing') {
      setTimeout(() => setPhase('success'), 2000);
    } else if (phase === 'success') {
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  }, [phase, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-['Outfit']">
      
      {/* Video Feed or Fallback */}
      <div className="absolute inset-0 overflow-hidden">
        {hasCamera ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
            <Camera className="w-16 h-16 text-white/20 animate-pulse" />
          </div>
        )}
      </div>

      {/* AR Overlays */}
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex justify-between items-center z-10">
          <div className="bg-white/80 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/50 text-slate-900 font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg">
            <ScanFace className="w-4 h-4 text-blue-600" /> Scanner IA
          </div>
          <button type="button" data-testid="ar-scanner-close" onClick={onClose} className="p-3 bg-white/80 backdrop-blur-xl rounded-full text-slate-900 border border-white/50 shadow-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Reticle */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative overflow-hidden flex items-center justify-center">
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-3xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-3xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-3xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-3xl" />
            
            {/* Laser Line */}
            {(phase === 'scanning' || phase === 'analyzing') && (
              <div 
                className="absolute top-0 left-0 w-full h-1 bg-emerald-400 shadow-[0_0_20px_#10b981]" 
                style={{
                  animation: 'scanLine 2s infinite linear'
                }}
              />
            )}

            {/* Analysis Overlay */}
            {phase === 'success' && (
              <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2" />
                <span className="text-white font-bold text-lg drop-shadow-md">Cylindre identifié</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Info Sheet */}
        <div className="bg-white/90 backdrop-blur-2xl border border-white rounded-[40px] p-8 z-10 transition-all duration-500 shadow-[0_-24px_48px_-12px_rgba(0,0,0,0.2)]">
          <h3 className="text-slate-900 font-black text-xl mb-2">
            {phase === 'init' && "Initialisation..."}
            {phase === 'scanning' && "Cadrage de la serrure..."}
            {phase === 'analyzing' && "Analyse Intelligence Artificielle..."}
            {phase === 'success' && "Diagnostic terminé"}
          </h3>
          
          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-slate-400 uppercase tracking-widest text-[10px]">Modèle détecté</span>
              <span className={`font-bold ${phase === 'success' ? 'text-slate-900' : 'text-slate-300'}`}>
                {phase === 'success' ? 'Cylindre Bricard Astral' : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-slate-400 uppercase tracking-widest text-[10px]">Temps estimé</span>
              <span className={`font-bold ${phase === 'success' ? 'text-blue-600' : 'text-slate-300'}`}>
                {phase === 'success' ? '15 minutes' : '---'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanLine {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
