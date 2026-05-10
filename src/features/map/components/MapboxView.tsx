"use client";
import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';
import DailyMissions from '@/features/dashboard/components/DailyMissions';
import BackOfficeInboxPanel from '@/features/backoffice/components/BackOfficeInboxPanel';
import RequesterTrackingPanel from '@/features/interventions/components/RequesterTrackingPanel';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useDateContext } from '@/context/DateContext';
import { generateDailyMissions, type Mission } from '@/utils/mockMissions';
import { useDashboardPagerOptional } from '@/features/dashboard/dashboardPagerContext';
import { useGalaxyLayerBridgeOptional } from '@/features/map/GalaxyLayerBridgeContext';
import { useCompanyWorkspaceOptional } from '@/context/CompanyWorkspaceContext';
import { useBackOfficeInterventions } from '@/features/backoffice/useBackOfficeInterventions';
import { interventionClientLabel, statusLabelFr, formatScheduledTimeOnly, interventionMatchesTab } from '@/features/interventions/technicianSchedule';
import { cn } from '@/lib/utils';

export default function MapboxView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const pager = useDashboardPagerOptional();
  const galaxyBridge = useGalaxyLayerBridgeOptional();
  
  const { selectedDate } = useDateContext();
  const workspace = useCompanyWorkspaceOptional();
  const { interventions: firestoreInterventions } = useBackOfficeInterventions(workspace?.activeCompanyId ?? null);

  const missions = useMemo(() => generateDailyMissions(selectedDate), [selectedDate]);
  const [liveMissions, setLiveMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const selectedDateStr = useMemo(() => selectedDate.toLocaleDateString('en-CA'), [selectedDate]);

  const allMissions = useMemo(() => {
    const liveForDay = liveMissions.filter((m) => !m.date || m.date === selectedDateStr);
    
    const realMissions: Mission[] = firestoreInterventions
      .filter(iv => interventionMatchesTab(iv, "today", selectedDate))
      .filter(iv => iv.location && typeof iv.location.lat === "number" && typeof iv.location.lng === "number")
      .map(iv => {
        let numericId = 0;
        for (let i = 0; i < iv.id.length; i++) {
          numericId = ((numericId << 5) - numericId) + iv.id.charCodeAt(i);
          numericId |= 0;
        }
        return {
          id: Math.abs(numericId),
          key: iv.id,
          clientName: interventionClientLabel(iv),
          coordinates: [iv.location.lng, iv.location.lat],
          time: formatScheduledTimeOnly(iv),
          status: statusLabelFr(iv.status),
          source: "live",
          date: iv.scheduledDate || selectedDateStr,
          phone: iv.clientPhone || iv.phone || undefined,
          address: iv.address || undefined,
          description: iv.problem || iv.transcription || undefined,
        };
      });

    const all = [...realMissions, ...liveForDay, ...missions];
    
    // Deduplicate by key or id
    const unique = new Map<string | number, Mission>();
    all.forEach(m => {
       const key = m.key ?? m.id;
       if (!unique.has(key)) unique.set(key, m);
    });
    const deduped = Array.from(unique.values());

    const score = (t: string) => {
      if (!t) return 9999;
      if (t === "Maintenant") return -1;
      const raw = t.trim();
      const last = raw.split(/\s+/).pop() || raw;
      const m = /^(\d{2}):(\d{2})$/.exec(last);
      if (!m) return 9999;
      return Number(m[1]) * 60 + Number(m[2]);
    };
    return [...deduped].sort((a, b) => score(a.time) - score(b.time));
  }, [missions, liveMissions, firestoreInterventions, selectedDateStr, selectedDate]);

  useEffect(() => {
    if (!galaxyBridge) return;

    galaxyBridge.registerInterventionConsumer((m) => {
      setLiveMissions((prev) => [
        { ...m, source: "live", date: m.date || selectedDateStr },
        ...prev.filter((x) => (x.key ?? String(x.id)) !== m.key),
      ]);
    });

    return () => galaxyBridge.registerInterventionConsumer(null);
  }, [galaxyBridge, selectedDateStr]);

  useEffect(() => {
    let cancelled = false;
    const loadLocal = async () => {
      try {
        const res = await fetch("/api/interventions/local");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          interventions: Array<{
            file: string;
            clientName: string | null;
            title: string;
            date: string | null;
            time: string;
            status: string;
            location: { lat: number; lng: number } | null;
          }>;
        };
        const next: Mission[] = (data.interventions || [])
          .filter((i) => i.date === selectedDateStr)
          .filter((i) => i.location && typeof i.location.lat === "number" && typeof i.location.lng === "number")
          .map((i) => ({
            id: Math.abs(
              i.file.split("").reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0)
            ),
            key: i.file,
            clientName: i.clientName ? `M. ${i.clientName.charAt(0).toUpperCase()}${i.clientName.slice(1).toLowerCase()}` : i.title || "Intervention",
            coordinates: [i.location!.lng, i.location!.lat],
            time: i.time,
            status: i.status,
            source: "live",
            date: i.date ?? selectedDateStr,
          }));
        setLiveMissions((prev) => {
          // merge by stable key (disk) while keeping any newly created in-memory ones
          const seen = new Set<string>(next.map((m) => m.key ?? String(m.id)));
          const keep = prev.filter((m) => !seen.has(m.key ?? String(m.id)));
          return [...keep, ...next];
        });
      } catch {
        /* ignore */
      }
    };
    void loadLocal();
    return () => {
      cancelled = true;
    };
  }, [selectedDateStr]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

      const initialCenter: [number, number] = [4.3522, 50.8466]; // Par défaut : Bruxelles

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/standard',
        center: initialCenter,
        zoom: 12.5,
        pitch: 0,
        bearing: 0,
        antialias: true,
        maxBounds: [
          [4.15, 50.70],
          [4.55, 50.95]
        ],
        minZoom: 11.8,
        attributionControl: false,
        localIdeographFontFamily: "'Noto Sans', 'Helvetica Neue', Arial, sans-serif"
      });

      mapRef.current = map;

      map.on('style.load', () => {
        map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
        map.setConfigProperty('basemap', 'showTransitLabels', false);
        map.setConfigProperty('basemap', 'showRoadLabels', true);
      });

      map.on('moveend', () => {
        const currentState = {
          center: map.getCenter().toArray(),
          zoom: map.getZoom(),
          pitch: 0,
          bearing: 0
        };
        localStorage.setItem('mapboxViewState', JSON.stringify(currentState));
      });
    }

    // Cleanup existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    const map = mapRef.current;
    if (!map) return;

    const bounds = new mapboxgl.LngLatBounds();

    // Ajouter les marqueurs pour les missions
    allMissions.forEach((mission, index) => {
      bounds.extend(mission.coordinates as [number, number]);

      const isLive = mission.source === "live";
      const isDone = mission.status === 'Terminé';
      const inProgress = mission.status === 'En cours';

      const shadowClass = isDone
        ? "shadow-[0_0_10px_rgba(40,224,90,0.65),0_6px_20px_rgba(40,224,90,0.75)]"
        : inProgress
          ? "shadow-[0_0_10px_rgba(255,149,0,0.65),0_6px_20px_rgba(255,149,0,0.75)]"
          : isLive
            ? "shadow-[0_0_12px_rgba(59,130,246,0.70),0_8px_26px_rgba(59,130,246,0.65)]"
            : "shadow-[0_0_10px_rgba(255,59,48,0.65),0_6px_20px_rgba(255,59,48,0.75)]";
          
      const textGradient = isDone
        ? 'from-green-500 via-emerald-600 to-teal-800'
        : inProgress
          ? 'from-amber-400 via-orange-500 to-rose-600'
          : isLive
            ? 'from-sky-400 via-blue-600 to-indigo-800'
            : 'from-red-500 via-rose-600 to-red-800';

      const borderClass = isDone
        ? 'border-[1.5px] border-solid border-emerald-500'
        : inProgress
          ? 'border-[1.5px] border-solid border-orange-500'
          : isLive
            ? 'border-[1.5px] border-solid border-blue-500'
            : 'border-[1.5px] border-solid border-red-500';

      const el = document.createElement('div');
      el.className = 'custom-marker-container relative';

      const glow = document.createElement('div');
      const glowColor = isDone
        ? 'rgba(40,224,90,0.45)'
        : inProgress
          ? 'rgba(255,149,0,0.45)'
          : isLive
            ? 'rgba(59,130,246,0.50)'
            : 'rgba(255,59,48,0.45)';
      glow.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full blur-xl transition-all duration-500';
      glow.style.backgroundColor = glowColor;
      el.appendChild(glow);

      const inner = document.createElement('div');
      inner.className = `relative flex items-center justify-center w-5 h-5 rounded-[6px] bg-white/95 backdrop-blur-xl transition-transform duration-[400ms] ease-out cursor-pointer ${shadowClass} ${borderClass}`;
      
      const textSpan = document.createElement('span');
      textSpan.className = `text-[10px] font-bold bg-gradient-to-br ${textGradient} bg-clip-text text-transparent leading-none`;
      textSpan.innerText = (index + 1).toString();
      
      inner.appendChild(textSpan);
      el.appendChild(inner);

      el.addEventListener('mouseenter', () => {
        inner.style.transform = 'scale(1.15)';
      });
      el.addEventListener('mouseleave', () => {
        inner.style.transform = 'scale(1)';
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedMission(mission);
        map.flyTo({ center: mission.coordinates as [number, number], zoom: 17, pitch: 0 });
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(mission.coordinates as [number, number])
        .addTo(map);
        
      const markerKey = mission.key ?? String(mission.id);
      markersRef.current[markerKey] = marker;
    });


  }, [allMissions]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const dashboardPageIndex = pager?.pageIndex ?? 0;

  useEffect(() => {
    if (dashboardPageIndex !== 0) return;
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => {
      try {
        map.resize();
      } catch {
        /* ignore */
      }
    }, 520);
    return () => clearTimeout(id);
  }, [dashboardPageIndex]);

  const handleMissionClick = (mission: any) => {
    setSelectedMission(mission);
    if (mapRef.current && mission.coordinates) {
      mapRef.current.flyTo({
        center: mission.coordinates,
        zoom: 17,
        pitch: 0,
        duration: 1500
      });
    }
  };


  const handleRecenter = () => {
    if (!mapRef.current) return;
    
    // Recentrer directement sur Bruxelles avec un zoom global
    mapRef.current.flyTo({
      center: [4.3522, 50.8466], // Coordonnées de Bruxelles
      zoom: 12.5, // Niveau de zoom pour voir toute la ville
      pitch: 0,
      bearing: 0,
      duration: 2000,
      essential: true
    });
  };


  return (
    <div
      id="map-container"
      className="relative z-0"
      style={{ userSelect: 'none', WebkitUserSelect: 'none', background: '#f8fafc' }}
    >
      <div ref={mapContainerRef} id="map" style={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }} />
      
      {/* Premium Recenter Button */}
      <button
        onClick={handleRecenter}
        className="group absolute bottom-6 right-6 z-[1] flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-[14px] border border-white/75 bg-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.076),0_2px_10px_rgba(0,0,0,0.038)] backdrop-blur-2xl backdrop-saturate-[180%] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_40px_rgba(0,0,0,0.11)] active:translate-y-0 active:scale-95"
        title="Recentrer la carte"
      >
        <svg
          className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-900"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      </button>

      {/* Overlay Description Mission */}
      <AnimatePresence>
        {selectedMission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-transparent to-black/60 pointer-events-auto"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl p-8 mx-4 flex flex-col items-center text-center"
            >
              <button
                onClick={() => setSelectedMission(null)}
                className="absolute top-[2mm] right-0 p-2 !text-white hover:opacity-80 transition-all hover:scale-110 z-50"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#ffffff">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="text-white w-full">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">{selectedMission.clientName}</h2>
                <div className="flex items-center justify-center gap-4 text-white/90 mb-10 text-xl">
                  <span className="px-4 py-1.5 font-semibold rounded-full bg-white/20">
                    {selectedMission.status}
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="font-medium">{selectedMission.time}</span>
                </div>

                <div className="flex flex-col gap-8 mt-2 w-full max-w-lg mx-auto text-left">
                  {selectedMission.phone && (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white/50 uppercase tracking-widest mb-1">Téléphone</span>
                      <a href={`tel:${selectedMission.phone}`} className="text-2xl font-medium text-white hover:text-blue-400 transition-colors">
                        {selectedMission.phone}
                      </a>
                    </div>
                  )}
                  {selectedMission.address && (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white/50 uppercase tracking-widest mb-1">Adresse</span>
                      <a 
                        href={`https://maps.google.com/?q=${encodeURIComponent(selectedMission.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-2xl font-medium text-white hover:text-blue-400 transition-colors flex items-center gap-2"
                      >
                        {selectedMission.address}
                        <svg className="w-5 h-5 text-white/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  {selectedMission.description && (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white/50 uppercase tracking-widest mb-2">Description du problème</span>
                      <p className="text-lg !text-white font-medium leading-relaxed bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                        {selectedMission.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DailyMissions missions={allMissions} onMissionClick={handleMissionClick} />

      {/* Panel à droite : inbox toujours monté (messages portail) ; suivi client sur les autres pages du carrousel. */}
      <div className="fixed right-12 top-1/2 -translate-y-1/2 z-40 flex h-[70vh] min-h-0 w-[calc(50vw-35vh-100px+5mm)] flex-col overflow-hidden rounded-[24px] border border-blue-400/20 bg-white/70 shadow-[0_0_60px_-15px_rgba(59,130,246,0.3),0_24px_56px_-22px_rgba(15,23,42,0.08)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500">
        <div className={cn("flex min-h-0 flex-1 flex-col", dashboardPageIndex !== 0 && "hidden")}>
          <BackOfficeInboxPanel />
        </div>
        <div className={cn("flex min-h-0 flex-1 flex-col", dashboardPageIndex === 0 && "hidden")}>
          <RequesterTrackingPanel />
        </div>
      </div>
    </div>
  );
}
