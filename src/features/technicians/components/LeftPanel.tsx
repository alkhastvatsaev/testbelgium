import React from 'react';
import { Target, MapPin, Truck, Wrench, Clock, PlusCircle, Navigation, Package, History, Coffee } from 'lucide-react';

export default function LeftPanel() {
  return (
    <div className="w-72 h-full bg-zinc-950 border-r border-white/10 flex flex-col text-white">
      {/* Profil rapide */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/20">
            A
          </div>
          <div>
            <h2 className="font-bold text-lg">Alexandre V.</h2>
            <p className="text-emerald-400 text-sm font-medium tracking-widest uppercase">En service</p>
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <a href="#" className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl text-white font-semibold">
          <MapPin className="w-6 h-6 text-blue-400" />
          Carte & Missions
        </a>
        <a href="#" className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl text-zinc-400 hover:text-white transition-colors font-semibold">
          <Package className="w-6 h-6" />
          Stock Camion
        </a>
        <a href="#" className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl text-zinc-400 hover:text-white transition-colors font-semibold">
          <History className="w-6 h-6" />
          Historique
        </a>
      </nav>

      {/* Bas de page */}
      <div className="p-4 border-t border-white/10">
        <button className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors font-semibold border border-white/5">
          <Coffee className="w-6 h-6" />
          Prendre une pause
        </button>
      </div>
    </div>
  );
}
