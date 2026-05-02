"use client";
import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import ClockCalendar from '@/features/dashboard/components/ClockCalendar';
import DailyMissions from '@/features/dashboard/components/DailyMissions';
import MapGalaxyTranscriptionLayer from '@/features/map/components/MapGalaxyTranscriptionLayer';
import QuoteRequests from '@/features/dashboard/components/QuoteRequests';
import UserProfile from '@/features/dashboard/components/UserProfile';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useDateContext } from '@/context/DateContext';
import { generateDailyMissions, type Mission } from '@/utils/mockMissions';

export default function MapboxView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  
  const { selectedDate } = useDateContext();
  const missions = useMemo(() => generateDailyMissions(selectedDate), [selectedDate]);
  const [liveMissions, setLiveMissions] = useState<Mission[]>([]);
  const selectedDateStr = useMemo(() => selectedDate.toLocaleDateString('en-CA'), [selectedDate]);
  const allMissions = useMemo(() => {
    const liveForDay = liveMissions.filter((m) => !m.date || m.date === selectedDateStr);
    const all = [...liveForDay, ...missions];
    const score = (t: string) => {
      if (!t) return 9999;
      if (t === "Maintenant") return -1;
      const raw = t.trim();
      const last = raw.split(/\s+/).pop() || raw;
      const m = /^(\d{2}):(\d{2})$/.exec(last);
      if (!m) return 9999;
      return Number(m[1]) * 60 + Number(m[2]);
    };
    return [...all].sort((a, b) => score(a.time) - score(b.time));
  }, [missions, liveMissions, selectedDateStr]);
  const [mapTranscriptionArmed, setMapTranscriptionArmed] = useState(false);

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

      let initialCenter: [number, number] = [4.3522, 50.8466]; // Par défaut : Bruxelles
      const bounds = new mapboxgl.LngLatBounds();
      
      if (allMissions.length > 0) {
        allMissions.forEach(mission => {
          bounds.extend(mission.coordinates as [number, number]);
        });
        initialCenter = bounds.getCenter().toArray() as [number, number];
      }

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/standard',
        center: initialCenter,
        zoom: 15.5,
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
        ? 'shadow-[0_0_10px_rgba(40,224,90,0.65),0_6px_20px_rgba(40,224,90,0.75)]' 
        : inProgress
          ? 'shadow-[0_0_10px_rgba(255,149,0,0.65),0_6px_20px_rgba(255,149,0,0.75)]'
          : isLive
            ? 'shadow-[0_0_12px_rgba(59,130,246,0.70),0_8px_26px_rgba(59,130,246,0.65)]'
            : 'shadow-[0_0_10px_rgba(255,59,48,0.65),0_6px_20px_rgba(255,59,48,0.75)]';
          
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
        map.flyTo({ center: mission.coordinates as [number, number], zoom: 17, pitch: 0 });
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(mission.coordinates as [number, number])
        .addTo(map);
        
      const markerKey = mission.key ?? String(mission.id);
      markersRef.current[markerKey] = marker;
    });

    if (allMissions.length > 0) {
      setTimeout(() => {
        map.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 380, right: 60 },
          pitch: 0,
          bearing: 0,
          duration: 1500,
          essential: true
        });
      }, 300);
    }

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

  const handleMissionClick = (mission: any) => {
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

      <MapGalaxyTranscriptionLayer
        transcriptionArmed={mapTranscriptionArmed}
        onUserPressPlay={() => setMapTranscriptionArmed(true)}
        onInterventionCreated={(m) =>
          setLiveMissions((prev) => [
            { ...m, source: "live", date: m.date || selectedDateStr },
            // remove any existing with same stable key (prevents duplicates on later reload)
            ...prev.filter((x) => (x.key ?? String(x.id)) !== m.key),
          ])
        }
      />

      <ClockCalendar />
      <UserProfile />
      <DailyMissions missions={allMissions} onMissionClick={handleMissionClick} />
      <QuoteRequests />
    </div>
  );
}
