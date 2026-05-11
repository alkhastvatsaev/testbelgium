/// <reference lib="webworker" />

import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { firebasePublicConfig, isFirebasePublicConfigured } from "../src/features/notifications/firebasePublicConfig";
import { BM_TECH_CASE_PARAM, BM_TECH_REMINDER_PARAM } from "../src/features/notifications/notificationConstants";
import { parseTechnicianNotificationSearchParams } from "../src/features/notifications/technicianNotificationUrls";

declare let self: ServiceWorkerGlobalScope;

function bootMessaging(): void {
  if (!isFirebasePublicConfigured()) return;

  const app = initializeApp(firebasePublicConfig as FirebaseOptions);
  const messaging = getMessaging(app);

  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? "BelgMap";
    const body = payload.notification?.body ?? "";
    const data = payload.data ?? {};

    const origin = self.location.origin;
    const interventionId = typeof data.interventionId === "string" ? data.interventionId : "";
    const openUrl =
      interventionId.length > 0
        ? `${origin}/?${BM_TECH_CASE_PARAM}=${encodeURIComponent(interventionId)}`
        : `${origin}/?${BM_TECH_REMINDER_PARAM}=1`;

    void self.registration.showNotification(title, {
      body,
      data: { ...data, url: openUrl },
      tag: interventionId ? `case-${interventionId}` : "technician-reminder",
    });
  });
}

bootMessaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl =
    typeof event.notification.data?.url === "string"
      ? event.notification.data.url
      : `${self.location.origin}/`;

  let targetUrl = rawUrl;
  try {
    const u = new URL(rawUrl, self.location.origin);
    const intent = parseTechnicianNotificationSearchParams(u.searchParams);
    if (intent.kind === "case") {
      targetUrl = `${self.location.origin}/?${BM_TECH_CASE_PARAM}=${encodeURIComponent(intent.caseId)}`;
    } else if (intent.kind === "reminder") {
      targetUrl = `${self.location.origin}/?${BM_TECH_REMINDER_PARAM}=1`;
    }
  } catch {
    /* garde rawUrl */
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.startsWith(self.location.origin)) as WindowClient | undefined;
      if (existing?.navigate) {
        return existing.navigate(targetUrl).then(() => existing.focus());
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
