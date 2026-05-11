"use client";

import { ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { useInterventionLive } from "@/features/interventions/useInterventionLive";
import { useTranslation } from "@/core/i18n/I18nContext";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

export default function TechnicianDashboardImagesPanel({
  caseId,
}: {
  caseId: string | null;
}) {
  const liveIv = useInterventionLive(caseId);
  const { t } = useTranslation();

  if (!caseId) {
    return (
      <div
        data-testid="technician-dashboard-images-empty"
        style={outfit}
        className="flex h-full w-full flex-col items-center justify-center rounded-[inherit] px-5 py-8 text-center"
      >
        <ImageIcon className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
        <p className="text-[14px] font-medium text-slate-400">
          {t("technician_hub.dashboard.images.no_mission_selected")}
        </p>
      </div>
    );
  }

  if (!liveIv) {
    return (
      <div
        data-testid="technician-dashboard-images-loading"
        style={outfit}
        className="flex h-full w-full flex-col p-4"
      >
        <div className="mb-4 h-6 w-1/2 animate-pulse rounded-md bg-slate-200/60" />
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-48 w-full animate-pulse rounded-[20px] bg-slate-200/60" />
          ))}
        </div>
      </div>
    );
  }

  const isClosed = liveIv.status === "done" || liveIv.status === "invoiced";
  if (isClosed) {
    return (
      <div
        data-testid="technician-dashboard-images-closed"
        style={outfit}
        className="flex h-full w-full flex-col items-center justify-center rounded-[inherit] px-5 py-8 text-center"
      >
        <ImageIcon className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
        <p className="text-[14px] font-medium text-slate-400">
          {t("technician_hub.dashboard.images.hidden_after_closure")}
        </p>
      </div>
    );
  }

  const images = liveIv.attachmentThumbnails || [];

  return (
    <div
      data-testid="technician-dashboard-images"
      style={outfit}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
    >

      <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-4 px-4 py-4`}>
        {images.length === 0 ? (
          <div
            data-testid="technician-dashboard-images-empty-photos"
            className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white/50 px-6 py-10 text-center"
          >
            <ImageIcon className="mb-3 h-8 w-8 text-slate-300" aria-hidden />
            <p className="text-[14px] font-medium text-slate-500">{t("technician_hub.dashboard.images.no_photos")}</p>
          </div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            className="flex flex-col gap-4"
          >
            {images.map((url, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="group relative overflow-hidden rounded-[20px] bg-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)]"
              >
                <img
                  src={url}
                  alt={`${t("technician_hub.dashboard.images.photo_alt")} ${idx + 1}`}
                  className="w-full object-cover"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
