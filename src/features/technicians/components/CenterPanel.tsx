import React, { useState } from 'react';
import { Map, List, Navigation, Phone, Play, MapPin, Clock } from 'lucide-react';

interface Mission {
  id: string;
  client: string;
  type: string;
  address: string;
  eta: string;
  distance: string;
}

interface CenterPanelProps {
  missions: Mission[];
  onSelectMission: (mission: Mission | null) => void;
  selectedMissionId?: string;
}

export default function CenterPanel({ missions, onSelectMission, selectedMissionId }: CenterPanelProps) {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 relative">
      {/* Toggle Carte / Liste (Flottant) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 bg-white p-1 rounded-full shadow-lg border border-slate-200 flex gap-1">
        <button
          onClick={() => setViewMode('map')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
            viewMode === 'map' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Map className="w-5 h-5" />
          Carte
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
            viewMode === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <List className="w-5 h-5" />
          Liste
        </button>
      </div>

      {viewMode === 'map' ? (
        <div className="w-full h-full bg-slate-900 relative">
          <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/4.35,50.85,12/800x800?access_token=pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2R1bW15In0.dummy')] bg-cover bg-center opacity-50" />
          
          {/* Pins simulés */}
          <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg shadow-blue-500/50 -translate-x-1/2 -translate-y-1/2 z-10" />
          <div className="absolute top-1/3 left-1/3 text-red-500 z-10 hover:scale-110 transition-transform cursor-pointer" onClick={() => onSelectMission(missions[0])}>
            <MapPin className="w-10 h-10 drop-shadow-xl" />
          </div>
          <div className="absolute top-2/3 left-2/3 text-amber-500 z-10 hover:scale-110 transition-transform cursor-pointer" onClick={() => onSelectMission(missions[1])}>
            <MapPin className="w-10 h-10 drop-shadow-xl" />
          </div>
        </div>
      ) : (
        <div className="w-full h-full overflow-y-auto p-6 pt-24 space-y-4">
          {missions.map((mission) => (
            <div 
              key={mission.id}
              onClick={() => onSelectMission(mission)}
              className={`bg-white rounded-[32px] p-6 shadow-sm border-2 cursor-pointer transition-all hover:shadow-xl ${
                selectedMissionId === mission.id ? 'border-emerald-500 shadow-emerald-500/10' : 'border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                      {mission.type}
                    </span>
                    <span className="text-slate-500 font-bold flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {mission.eta} • {mission.distance}
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900">{mission.client}</h3>
                  <p className="text-slate-500 font-medium text-lg mt-1">{mission.address}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-4 font-bold flex justify-center items-center gap-2 text-lg transition-colors">
                  <Navigation className="w-6 h-6" />
                  Naviguer
                </button>
                <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl py-4 font-bold flex justify-center items-center gap-2 text-lg transition-colors">
                  <Phone className="w-6 h-6" />
                  Appeler
                </button>
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl py-4 font-bold flex justify-center items-center gap-2 text-lg transition-colors border border-slate-200">
                  <Play className="w-6 h-6" />
                  Démarrer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
