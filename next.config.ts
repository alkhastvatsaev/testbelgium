import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapbox-tiles',
          expiration: {
            maxEntries: 2000, // Garde jusqu'à 2000 tuiles (tout Bruxelles)
            maxAgeSeconds: 30 * 24 * 60 * 60, // Garde en mémoire pendant 30 jours
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // File d'attente hors-ligne pour toutes les requêtes d'API (SMS, OpenAI, Google)
      {
        urlPattern: /^\/api\/.*/i,
        handler: 'NetworkOnly',
        options: {
          backgroundSync: {
            name: 'api-queue',
            options: {
              maxRetentionTime: 24 * 60, // Conserve les requêtes en échec pendant 24h
            },
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["fluent-ffmpeg"],
};

export default withPWA(nextConfig);
