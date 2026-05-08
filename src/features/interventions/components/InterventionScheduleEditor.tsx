"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { CalendarPlus, Download } from "lucide-react";
import { toast } from "sonner";
import { auth, firestore, isConfigured } from "@/core/config/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Intervention } from "@/features/interventions/types";
import { googleCalendarTemplateUrl, outlookOfficeComposeUrl } from "@/features/calendar/calendarDeepLinks";
import { interventionHasScheduledSlot } from "@/features/calendar/interventionScheduleRange";
import { buildInterventionIcs } from "@/features/calendar/icsEvent";

const exportLinkClass = cn(
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-slate-100 px-3 text-xs font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
);

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function InterventionScheduleEditor({
  intervention,
  isAdmin,
}: {
  intervention: Intervention;
  isAdmin: boolean;
}) {
  const hasSchedule = interventionHasScheduledSlot(intervention);
  const [dateStr, setDateStr] = useState((intervention.scheduledDate ?? "").trim());
  const [timeStr, setTimeStr] = useState((intervention.scheduledTime ?? "").trim());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDateStr((intervention.scheduledDate ?? "").trim());
    setTimeStr((intervention.scheduledTime ?? "").trim());
  }, [intervention.id, intervention.scheduledDate, intervention.scheduledTime]);

  const preview: Intervention = { ...intervention, scheduledDate: dateStr, scheduledTime: timeStr };
  const googleUrl = googleCalendarTemplateUrl(preview);
  const outlookUrl = outlookOfficeComposeUrl(preview);
  const icsBody = buildInterventionIcs(preview);

  const handleSave = useCallback(async () => {
    if (!isConfigured || !firestore || !auth?.currentUser) {
      toast.error("Firebase indisponible");
      return;
    }
    if (!dateStr.trim() || !timeStr.trim()) {
      toast.error("Date et heure requises");
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(firestore, "interventions", intervention.id), {
        scheduledDate: dateStr.trim(),
        scheduledTime: timeStr.trim(),
      });
      toast.success("Créneau enregistré");
    } catch (e) {
      console.error(e);
      toast.error("Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }, [dateStr, intervention.id, timeStr]);

  const handleClear = useCallback(async () => {
    if (!isConfigured || !firestore || !auth?.currentUser) {
      toast.error("Firebase indisponible");
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(firestore, "interventions", intervention.id), {
        scheduledDate: deleteField(),
        scheduledTime: deleteField(),
      });
      setDateStr("");
      setTimeStr("");
      toast.message("Créneau effacé");
    } catch (e) {
      console.error(e);
      toast.error("Suppression impossible");
    } finally {
      setBusy(false);
    }
  }, [intervention.id]);

  const handleDownloadIcs = useCallback(() => {
    if (!icsBody.trim()) {
      toast.error("Créneau invalide pour export");
      return;
    }
    downloadTextFile(`intervention-${intervention.id}.ics`, icsBody, "text/calendar;charset=utf-8");
    toast.success("Fichier .ics téléchargé");
  }, [icsBody, intervention.id]);

  if (!isAdmin && !hasSchedule) return null;

  const exportReady = Boolean(dateStr.trim() && timeStr.trim() && googleUrl && outlookUrl && icsBody.trim());

  return (
    <Card data-testid="intervention-schedule-editor" className="border-black/[0.06] bg-white/95 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Planification & calendriers</CardTitle>
        <CardDescription>
          Créneau RDV · exports Google / Outlook / .ics sans OAuth.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isAdmin ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`sched-date-${intervention.id}`}>Date</Label>
              <Input
                id={`sched-date-${intervention.id}`}
                data-testid="intervention-schedule-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`sched-time-${intervention.id}`}>Heure</Label>
              <Input
                id={`sched-time-${intervention.id}`}
                data-testid="intervention-schedule-time"
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || !dateStr.trim() || !timeStr.trim()}
              data-testid="intervention-schedule-save"
              onClick={() => void handleSave()}
            >
              Enregistrer le créneau
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy || !hasSchedule} onClick={() => void handleClear()}>
              Effacer
            </Button>
          </div>
        ) : null}

        {!exportReady ? (
          <p className="text-[13px] font-medium text-slate-600">
            {isAdmin ? "Renseignez date et heure pour activer les exports." : "Aucun créneau défini pour ce dossier."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Exporter</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={googleUrl!}
                target="_blank"
                rel="noreferrer"
                data-testid="intervention-schedule-google"
                className={exportLinkClass}
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Ajouter à Google Calendar
              </a>
              <a
                href={outlookUrl!}
                target="_blank"
                rel="noreferrer"
                data-testid="intervention-schedule-outlook"
                className={exportLinkClass}
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Ajouter à Outlook
              </a>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                data-testid="intervention-schedule-ics"
                onClick={handleDownloadIcs}
              >
                <Download className="h-4 w-4" aria-hidden />
                Télécharger .ics
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
