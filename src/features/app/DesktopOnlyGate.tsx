"use client";

import React, { useEffect, useState } from "react";

/** Détection PWA / navigateur sur téléphone (Android, iPhone, iPod). iPad exclu pour usage tablette large. */
function isPhoneClassDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return true;
  if (/iPhone|iPod/i.test(ua)) return true;
  return false;
}

export default function DesktopOnlyGate({ children }: { children: React.ReactNode }) {
  const [desktopOk, setDesktopOk] = useState<boolean | null>(null);

  useEffect(() => {
    setDesktopOk(!isPhoneClassDevice());
  }, []);

  if (desktopOk === null) {
    return (
      <div data-testid="desktop-only-loading" className="flex min-h-dvh items-center justify-center bg-[#f8fafc]">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"
          aria-hidden
        />
      </div>
    );
  }

  if (!desktopOk) {
    return (
      <div data-testid="desktop-only-blocked" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#f8fafc] px-6 text-center">
        <p className="text-lg font-semibold text-slate-800">Version desktop uniquement</p>
        <p className="max-w-md text-sm leading-relaxed text-slate-600">
          Version desktop seulement — le mobile (Android / iPhone) est en cours de développement. Ouvrez cette
          application depuis un ordinateur.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
