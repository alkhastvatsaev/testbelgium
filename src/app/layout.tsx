import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/core/i18n/I18nContext";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "BelgMap PWA",
  description: "Plateforme de gestion d'interventions de serrurerie en Belgique",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${outfit.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <I18nProvider>{children}</I18nProvider>
        <Toaster position="top-center" theme="light" richColors closeButton />
      </body>
    </html>
  );
}
