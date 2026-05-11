"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";

/** Centre — Région de Bruxelles */
const BRUSSELS: [number, number] = [4.3522, 50.8466];
const CITY_ZOOM = 10.85;
const ADDRESS_ZOOM = 15.35;
const GEOCODE_MIN_LEN = 6;
const GEOCODE_DEBOUNCE_MS = 480;

type Props = {
  address: string;
  placeLatLng?: { lat: number; lng: number };
  className?: string;
};

export default function SmartFormAddressMiniMap({ address, placeLatLng, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const latestRef = useRef({ address, placeLatLng });
  latestRef.current = { address, placeLatLng };
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";

  useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: BRUSSELS,
      zoom: CITY_ZOOM,
      interactive: false,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !token) return;

    const ensureMarker = (lng: number, lat: number) => {
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: "#0f172a" }).setLngLat([lng, lat]).addTo(map);
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }
    };

    const clearMarker = () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };

    const flyBrussels = () => {
      clearMarker();
      map.flyTo({ center: BRUSSELS, zoom: CITY_ZOOM, essential: true, duration: 450 });
    };

    if (placeLatLng && Number.isFinite(placeLatLng.lat) && Number.isFinite(placeLatLng.lng)) {
      const { lng, lat } = placeLatLng;
      ensureMarker(lng, lat);
      map.flyTo({ center: [lng, lat], zoom: ADDRESS_ZOOM, essential: true, duration: 850 });
      return;
    }

    const q = address.trim();
    if (q.length < GEOCODE_MIN_LEN) {
      flyBrussels();
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/maps/geocode?q=${encodeURIComponent(q)}`);
          if (!res.ok) return;
          const data = (await res.json()) as {
            location?: { lat: number; lng: number };
            approximate?: boolean;
          };
          if (data.approximate || !data.location) {
            if (latestRef.current.placeLatLng) return;
            flyBrussels();
            return;
          }
          const { lat, lng } = data.location;
          if (typeof lat !== "number" || typeof lng !== "number") return;

          const { placeLatLng: plNow, address: addrNow } = latestRef.current;
          if (plNow) return;
          if (addrNow.trim() !== q) return;

          ensureMarker(lng, lat);
          map.flyTo({ center: [lng, lat], zoom: ADDRESS_ZOOM, essential: true, duration: 850 });
        } catch {
          if (!latestRef.current.placeLatLng) flyBrussels();
        }
      })();
    }, GEOCODE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [address, placeLatLng, token]);

  return (
    <div
      data-testid="smart-form-address-mini-map"
      className={cn(
        "relative h-40 w-full overflow-hidden rounded-[16px] border border-black/[0.08] bg-slate-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
        className,
      )}
      aria-label="Aperçu de la localisation sur la carte"
    >
      {token ? (
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      ) : (
        <div className="flex h-full items-center justify-center px-3 text-center text-[11px] font-medium text-slate-500">
          Carte : définissez NEXT_PUBLIC_MAPBOX_TOKEN pour l&apos;aperçu
        </div>
      )}
    </div>
  );
}
