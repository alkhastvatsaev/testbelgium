"use client";
import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Trash2 } from "lucide-react";
import { doc, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/core/config/firebase';
import { toast } from "sonner";
import DailyMissions from '@/features/dashboard/components/DailyMissions';
import BackOfficeInboxPanel from '@/features/backoffice/components/BackOfficeInboxPanel';
import RequesterTrackingPanel from '@/features/interventions/components/RequesterTrackingPanel';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useDateContext } from '@/context/DateContext';
import { generateDailyMissions, type Mission } from '@/utils/mockMissions';
import { realInterventionsOnly } from '@/core/config/devUiPreview';
import { useDashboardPagerOptional } from '@/features/dashboard/dashboardPagerContext';
import { useGalaxyLayerBridgeOptional } from '@/features/map/GalaxyLayerBridgeContext';
import { useCompanyWorkspaceOptional } from '@/context/CompanyWorkspaceContext';
import { useBackOfficeInterventions } from '@/features/backoffice/useBackOfficeInterventions';
import {
  interventionClientLabel,
  statusLabelKey,
  formatScheduledTimeOnly,
  interventionMatchesTab,
  dailyMissionCardToneFromStatus,
} from '@/features/interventions/technicianSchedule';
import { cn } from '@/lib/utils';
import { useTranslation } from "@/core/i18n/I18nContext";
import { devUiPreviewEnabled } from "@/core/config/devUiPreview";
import { missionStableKey } from "@/features/map/missionStableKey";
import { useMapArchivedMissions } from "@/features/map/useMapArchivedMissions";
import {
  DASHBOARD_DESKTOP_COL_CLASS,
  DASHBOARD_DESKTOP_GRID_CLASS,
  DASHBOARD_DESKTOP_GRID_FILL_CLASS,
  DASHBOARD_DESKTOP_ROOT_CLASS,
  dashboardMapCenterSquareClass,
  dashboardMapRightShellClass,
  dashboardTripleSideShellClass,
  DASHBOARD_DESKTOP_GALAXY_BOTTOM_CLASS,
  DASHBOARD_DESKTOP_GALAXY_INSET_END_CLASS,
} from "@/core/ui/dashboardDesktopLayout";
import GlassPanel from "@/core/ui/GlassPanel";
import { GLASS_PANEL_BODY_SCROLL } from "@/core/ui/glassPanelChrome";

export default function MapboxView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const pager = useDashboardPagerOptional();
  const galaxyBridge = useGalaxyLayerBridgeOptional();
  const { t } = useTranslation();
  const { archivedKeys, archiveKey } = useMapArchivedMissions();
  
  const { selectedDate } = useDateContext();
  const workspace = useCompanyWorkspaceOptional();
  const { interventions: firestoreInterventions } = useBackOfficeInterventions(workspace?.activeCompanyId ?? null);

  const missions = useMemo(
    () => (!devUiPreviewEnabled || realInterventionsOnly ? [] : generateDailyMissions(selectedDate)),
    [selectedDate],
  );
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
          clientName: interventionClientLabel(iv) || String(t("common.client")),
          coordinates: [iv.location.lng, iv.location.lat],
          time: formatScheduledTimeOnly(iv),
          status: String(t(statusLabelKey(iv.status))),
          statusCode: iv.status,
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
  }, [missions, liveMissions, firestoreInterventions, selectedDateStr, selectedDate, t]);

  const visibleMissions = useMemo(
    () => allMissions.filter((m) => !archivedKeys.has(missionStableKey(m))),
    [allMissions, archivedKeys],
  );

  const handleArchiveMission = React.useCallback(
    (mission: Mission) => {
      archiveKey(missionStableKey(mission));
      setSelectedMission((prev) => (prev && missionStableKey(prev) === missionStableKey(mission) ? null : prev));
      toast.success(String(t("map.daily_missions.archived_toast")));
    },
    [archiveKey, t],
  );
  
  const handleDeleteMission = React.useCallback(
    async (mission: Mission) => {
      const ok = window.confirm(String(t("map.daily_missions.delete_confirm")));
      if (!ok) return;

      if (mission.source === "live" && mission.key && !mission.key.endsWith(".json")) {
        // Real Firestore mission
        try {
          await deleteDoc(doc(firestore!, "interventions", mission.key));
          toast.success(String(t("map.daily_missions.deleted_toast")));
          setSelectedMission(null);
        } catch (e) {
          toast.error("Erreur de suppression");
        }
      } else {
        // Mock mission, just archive it locally
        archiveKey(missionStableKey(mission));
        setSelectedMission(null);
        toast.success(String(t("map.daily_missions.deleted_toast")));
      }
    },
    [archiveKey, t],
  );

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
    if (realInterventionsOnly) return;
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
            clientName: i.clientName
              ? `M. ${i.clientName.charAt(0).toUpperCase()}${i.clientName.slice(1).toLowerCase()}`
              : i.title || t("map.mission.fallback_title"),
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
  }, [selectedDateStr, realInterventionsOnly]);

  useEffect(() => {
    if (!realInterventionsOnly) return;
    setLiveMissions((prev) =>
      prev.filter((m) => {
        const k = m.key;
        return typeof k !== "string" || !k.endsWith(".intervention.json");
      }),
    );
  }, [realInterventionsOnly]);

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
    visibleMissions.forEach((mission, index) => {
      bounds.extend(mission.coordinates as [number, number]);

      const isLive = mission.source === "live";
      const tone =
        (mission as any).statusCode
          ? dailyMissionCardToneFromStatus((mission as any).statusCode)
          : "upcoming";
      const isDone = tone === "done";
      const inProgress = tone === "active";

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


  }, [visibleMissions]);

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

  const handleMissionClick = (mission: Mission) => {
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
    <div className={DASHBOARD_DESKTOP_ROOT_CLASS}>
      <div className={`${DASHBOARD_DESKTOP_GRID_CLASS} ${DASHBOARD_DESKTOP_GRID_FILL_CLASS}`}>
        <GlassPanel
          as="aside"
          id="dashboard-left-rail"
          className={`${DASHBOARD_DESKTOP_COL_CLASS} dashboard-desktop-col--left`}
          shellClassName={dashboardTripleSideShellClass}
          innerClassName={`${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col`}
        >
          <DailyMissions
            missions={visibleMissions}
            onMissionClick={handleMissionClick}
            isEmbedded
          />
        </GlassPanel>

        <GlassPanel
          as="main"
          id="map-container"
          className={`${DASHBOARD_DESKTOP_COL_CLASS} dashboard-desktop-col--center`}
          shellClassName={dashboardMapCenterSquareClass}
          innerClassName="relative min-h-0 flex-1 p-0"
        >
            <div
              className="relative flex min-h-0 flex-1 flex-col"
              style={{ userSelect: "none", WebkitUserSelect: "none", background: "#f8fafc" }}
            >
          <div ref={mapContainerRef} id="map" className="absolute inset-0 h-full w-full" />
      
      {/* Premium Recenter Button */}
      <button
        onClick={handleRecenter}
        className={`group absolute z-[1] flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-[14px] border border-white/75 bg-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.076),0_2px_10px_rgba(0,0,0,0.038)] backdrop-blur-2xl backdrop-saturate-[180%] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_40px_rgba(0,0,0,0.11)] active:translate-y-0 active:scale-95 ${DASHBOARD_DESKTOP_GALAXY_BOTTOM_CLASS} ${DASHBOARD_DESKTOP_GALAXY_INSET_END_CLASS}`}
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
            className="absolute inset-0 z-50 flex min-h-0 items-start justify-center overflow-y-auto overscroll-y-contain bg-gradient-to-b from-transparent to-black/60 p-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-auto sm:p-5 sm:pb-10"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative mx-auto mb-6 mt-1 w-full max-w-2xl shrink-0 rounded-2xl border border-white/10 bg-black/25 px-4 py-6 shadow-lg backdrop-blur-md sm:mb-10 sm:mt-2 sm:px-8 sm:py-8"
            >
              <button
                type="button"
                onClick={() => setSelectedMission(null)}
                className="absolute right-1 top-1 z-50 rounded-full p-2 !text-white hover:bg-white/10 hover:opacity-90 sm:right-2 sm:top-2"
                aria-label={String(t("common.close"))}
              >
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="#ffffff" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="w-full pt-1 pr-10 text-center text-white sm:pr-12 sm:pt-2">
                <h2 className="break-words text-2xl font-bold leading-snug tracking-tight text-white sm:text-4xl md:text-5xl">
                  {selectedMission.clientName}
                </h2>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-base text-white/90 sm:mt-5 sm:gap-4 sm:text-lg">
                  <span className="px-3 py-1 font-semibold rounded-full bg-white/20 sm:px-4 sm:py-1.5">
                    {selectedMission.status}
                  </span>
                  <span className="hidden text-white/40 sm:inline">•</span>
                  <span className="font-medium">{selectedMission.time}</span>
                </div>

                <div className="mt-6 flex w-full max-w-lg flex-col gap-5 text-left sm:mt-8 sm:gap-7 mx-auto">
                  {selectedMission.phone && (
                    <div className="flex min-w-0 flex-col">
                      <span className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1 sm:text-sm">
                        {t("map.mission_overlay.phone")}
                      </span>
                      <a href={`tel:${selectedMission.phone}`} className="break-all text-lg font-medium text-white hover:text-blue-400 transition-colors sm:text-2xl">
                        {selectedMission.phone}
                      </a>
                    </div>
                  )}
                  {selectedMission.address && (
                    <div className="flex min-w-0 flex-col">
                      <span className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1 sm:text-sm">
                        {t("map.mission_overlay.address")}
                      </span>
                      <a 
                        href={`https://maps.google.com/?q=${encodeURIComponent(selectedMission.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium text-white hover:text-blue-400 transition-colors sm:text-2xl flex flex-wrap items-start gap-2"
                      >
                        <span className="min-w-0 break-words">{selectedMission.address}</span>
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-white/50 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  {selectedMission.description && (
                    <div className="flex min-w-0 flex-col">
                      <span className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1.5 sm:text-sm sm:mb-2">
                        {t("map.mission_overlay.problem_description")}
                      </span>
                      <p className="break-words text-base !text-white font-medium leading-relaxed rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm sm:p-5 sm:text-lg">
                        {selectedMission.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-center gap-4 sm:mt-8">
                  <button
                    type="button"
                    onClick={() => handleArchiveMission(selectedMission)}
                    aria-label={String(t("map.daily_missions.archive_aria"))}
                    title={String(t("map.daily_missions.archive_aria"))}
                    className="rounded-full border border-white/20 bg-white/[0.06] p-2.5 text-white/50 shadow-sm transition hover:border-white/35 hover:bg-white/10 hover:text-white/85"
                  >
                    <Archive className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMission(selectedMission)}
                    aria-label={String(t("map.daily_missions.delete_aria"))}
                    title={String(t("map.daily_missions.delete_aria"))}
                    className="rounded-full border border-red-500/30 bg-red-500/10 p-2.5 text-red-400/70 shadow-sm transition hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
          </div>
        </GlassPanel>

        <GlassPanel
          as="aside"
          className={`${DASHBOARD_DESKTOP_COL_CLASS} dashboard-desktop-col--right`}
          shellClassName={dashboardMapRightShellClass}
          innerClassName="flex min-h-0 flex-1 flex-col"
        >
          <div className={cn("flex min-h-0 flex-1 flex-col", dashboardPageIndex !== 0 && "hidden")}>
            <BackOfficeInboxPanel />
          </div>
          <div className={cn("flex min-h-0 flex-1 flex-col", dashboardPageIndex === 0 && "hidden")}>
            <RequesterTrackingPanel />
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

