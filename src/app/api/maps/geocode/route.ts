import { NextResponse } from "next/server";
import {
  mapboxReverseGeocodeAttemptUrls,
  pickPlaceLabelFromFeatures,
  type MapboxGeocodeFeature,
} from "@/core/maps/mapboxReverseGeocode";

export const runtime = "nodejs";

const FALLBACK_BE = { lat: 50.8466, lng: 4.3522 };

function mapboxToken(): string | null {
  return (
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    null
  );
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const token = mapboxToken();
  if (!token) return null;

  const q = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${encodeURIComponent(
    token,
  )}&country=be&language=fr&limit=1`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as
    | { features?: Array<{ center?: [number, number] }> }
    | null;
  const center = data?.features?.[0]?.center;
  if (!center || center.length !== 2) return null;
  const [lng, lat] = center;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ address: string | null; location: { lat: number; lng: number } }> {
  const token = mapboxToken();
  const location = { lat, lng };
  if (!token) {
    return { address: null, location };
  }

  const urls = mapboxReverseGeocodeAttemptUrls(lng, lat, token, 10);

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json().catch(() => null)) as {
        features?: MapboxGeocodeFeature[];
      } | null;
      const label = pickPlaceLabelFromFeatures(data?.features);
      if (label) return { address: label, location };
    } catch {
      /* essai suivant */
    }
  }

  return { address: null, location };
}

function parseCoords(searchParams: URLSearchParams): { lat: number; lng: number } | null {
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * - `?q=` — géocodage direct (adresse → coordonnées).
 * - `?lat=&lng=` — géocodage inverse (coordonnées → adresse lisible).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coords = parseCoords(searchParams);

  if (coords) {
    const { address, location } = await reverseGeocode(coords.lat, coords.lng);
    return NextResponse.json({
      address,
      location,
      approximate: address === null,
    });
  }

  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Paramètre q (adresse) ou lat et lng requis" }, { status: 400 });
  }

  const location = await geocodeAddress(q);
  return NextResponse.json({
    location: location ?? FALLBACK_BE,
    approximate: location === null,
  });
}
