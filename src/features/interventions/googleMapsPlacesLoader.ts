/**
 * Charge le script Google Maps JS (Places). Idempotent.
 */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const win = window as unknown as { google?: { maps?: { places?: unknown } } };
  if (win.google?.maps?.places) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const scriptId = "bm-google-maps-places";
    if (document.getElementById(scriptId)) {
      const poll = window.setInterval(() => {
        const w = window as unknown as { google?: { maps?: { places?: unknown } } };
        if (w.google?.maps?.places) {
          window.clearInterval(poll);
          resolve();
        }
      }, 40);
      window.setTimeout(() => {
        window.clearInterval(poll);
        reject(new Error("maps timeout"));
      }, 9000);
      return;
    }

    const s = document.createElement("script");
    s.id = scriptId;
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly&language=fr`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("maps script"));
    document.head.appendChild(s);
  });
}
