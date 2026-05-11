import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import withPWAInit from "@ducanh2912/next-pwa";

/** SHA injecté au build : sur Vercel = VERCEL_GIT_COMMIT_SHA ; en local = git rev-parse HEAD (compare avec le déploiement). */
function resolveGitShaForBuild(): string {
  const vercel = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (vercel) return vercel;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

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
  env: {
    NEXT_PUBLIC_APP_GIT_SHA: resolveGitShaForBuild(),
  },
  outputFileTracingRoot: __dirname,
};

export default withPWA(nextConfig);
