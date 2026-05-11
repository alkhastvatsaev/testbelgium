import type { Metadata, Viewport } from "next";
import { Outfit, Geist } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/core/i18n/I18nContext";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

const appGitSha = process.env.NEXT_PUBLIC_APP_GIT_SHA ?? "";

export const metadata: Metadata = {
  title: "testbelgiquepwa",
  description: "Plateforme de gestion d'interventions de serrurerie en Belgique",
  manifest: "/manifest.json",
  ...(appGitSha
    ? {
        other: {
          "application-git-sha": appGitSha,
        },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { Toaster } from 'sonner';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn(outfit.variable, "font-sans", geist.variable)} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <I18nProvider>{children}</I18nProvider>
        <Toaster position="top-center" theme="light" richColors closeButton />
      </body>
    </html>
  );
}
