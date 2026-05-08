import React, { useState } from 'react';
import { Navigation, Phone, CheckSquare, Square, Camera, Mic, ChevronRight, AlertTriangle } from 'lucide-react';

interface Mission {
  id: string;
  client: string;
  type: string;
  address: string;
  eta: string;
  distance: string;
}

interface RightPanelProps {
  selectedMission: Mission | null;
}

export default function RightPanel({ selectedMission }: RightPanelProps) {
  const [missionStatus, setMissionStatus] = useState<'available' | 'en_route' | 'on_site' | 'done'>('available');

  if (!selectedMission) {
    return (
      <div className="w-[450px] h-full bg-white border-l border-slate-200 flex flex-col p-8">
        <h2 className="text-3xl font-black text-slate-900 mb-8">Résumé de la journée</h2>
        
        <div className="space-y-6 flex-1">
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-sm mb-1">Fin estimée</p>
            <p className="text-4xl font-black text-slate-900">18h30</p>
          </div>
          
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-sm mb-1">Distance parcourue</p>
            <p className="text-4xl font-black text-slate-900">124 km</p>
          </div>
          
          <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
            <p className="text-red-500 font-bold uppercase tracking-wider text-sm mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Stock à recharger
            </p>
            <ul className="mt-4 space-y-2 text-red-900 font-semibold">
              <li>• Cylindre 30x30 (Reste 1)</li>
              <li>• WD40 (Vide)</li>
            </ul>
          </div>
        </div>

        <button className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-2xl py-8 rounded-[32px] shadow-xl shadow-red-600/20 transition-transform active:scale-95 flex items-center justify-center gap-3">
          <AlertTriangle className="w-8 h-8" />
          CRÉER URGENCE
        </button>
      </div>
    );
  }

  return (
    <div className="w-[450px] h-full bg-white border-l border-slate-200 flex flex-col relative shadow-2xl">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <span className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-4 inline-block">
              {selectedMission.type}
            </span>
            <h2 className="text-4xl font-black text-slate-900 mb-2 leading-tight">{selectedMission.client}</h2>
            <p className="text-slate-500 font-semibold text-lg">{selectedMission.address}</p>
          </div>

          <div className="flex flex-col gap-3 mb-10">
            <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl py-6 rounded-3xl shadow-lg shadow-emerald-500/20 transition-transform active:scale-95 flex justify-center items-center gap-3">
              <Navigation className="w-8 h-8" />
              NAVIGUER VERS LE CLIENT
            </button>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black text-xl py-6 rounded-3xl shadow-lg shadow-blue-500/20 transition-transform active:scale-95 flex justify-center items-center gap-3">
              <Phone className="w-8 h-8" />
              APPELER LE CLIENT
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Description</h3>
              <p className="text-slate-600 text-lg leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100">
                Le client est bloqué à l'extérieur, la clé est à l'intérieur sur la serrure. Ne pas percer si possible.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Checklist Sécurité</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <Square className="w-8 h-8 text-slate-400" />
                  <span className="text-lg font-semibold text-slate-700">Vérifier identité du client</span>
                </label>
                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <Square className="w-8 h-8 text-slate-400" />
                  <span className="text-lg font-semibold text-slate-700">Devis signé avant travaux</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Média</h3>
              <div className="flex gap-4">
                <button className="flex-1 aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors">
                  <Camera className="w-8 h-8" />
                  <span className="font-bold">Avant</span>
                </button>
                <button className="flex-1 aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors">
                  <Camera className="w-8 h-8" />
                  <span className="font-bold">Après</span>
                </button>
              </div>
            </div>

            <div>
              <button className="w-full flex justify-between items-center bg-purple-50 hover:bg-purple-100 border border-purple-100 p-6 rounded-3xl transition-colors">
                <div className="flex items-center gap-4 text-purple-700">
                  <Mic className="w-8 h-8" />
                  <span className="text-xl font-bold">Dictée vocale</span>
                </div>
                <ChevronRight className="w-6 h-6 text-purple-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-slate-200">
        <div className="bg-slate-100 rounded-full p-2 flex">
          <button 
            onClick={() => setMissionStatus('en_route')}
            className={`flex-1 py-4 px-6 rounded-full font-bold text-lg transition-all ${missionStatus === 'en_route' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500'}`}
          >
            En route
          </button>
          <button 
            onClick={() => setMissionStatus('on_site')}
            className={`flex-1 py-4 px-6 rounded-full font-bold text-lg transition-all ${missionStatus === 'on_site' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Sur place
          </button>
          <button 
            onClick={() => setMissionStatus('done')}
            className={`flex-1 py-4 px-6 rounded-full font-bold text-lg transition-all ${missionStatus === 'done' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Terminé
          </button>
        </div>
      </div>
    </div>
  );
}
