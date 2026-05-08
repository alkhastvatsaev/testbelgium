import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

/** En dev, la PWA (service worker) est désactivée par défaut — FCM Web a besoin du SW. Voir ENABLE_PWA_IN_DEV. */
const pwaDisabledInDev =
  process.env.NODE_ENV === "development" && process.env.ENABLE_PWA_IN_DEV !== "true";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  disable: pwaDisabledInDev,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 24,
            maxAgeSeconds: 365 * 24 * 60 * 60,
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
