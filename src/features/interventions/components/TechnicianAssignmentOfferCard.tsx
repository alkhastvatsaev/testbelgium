"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { firestore } from "@/core/config/firebase";
import type { Intervention } from "@/features/interventions/types";
import {
  acceptTechnicianAssignmentPatch,
  declineTechnicianAssignmentPatch,
} from "@/features/interventions/technicianAssignmentActions";
import { formatScheduledTimeOnly } from "@/features/interventions/technicianSchedule";
import { capitalizeName } from "@/utils/stringUtils";
import { guessGenderPrefixFromName } from "@/utils/genderDetection";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/core/i18n/I18nContext";

const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

type Props = {
  iv: Intervention;
  index: number;
  isSelected: boolean;
  technicianUid: string;
  onSelect: () => void;
};

export default function TechnicianAssignmentOfferCard({
  iv,
  index,
  isSelected,
  technicianUid,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);

  let firstName = iv.clientFirstName;
  let lastName = iv.clientLastName;
  if (!firstName && iv.clientName) {
    const parts = iv.clientName.trim().split(" ");
    firstName = parts[0];
    if (!lastName && parts.length > 1) lastName = parts.slice(1).join(" ");
    else if (!lastName) lastName = parts[0];
  }
  const lastNameSafe = (lastName ?? iv.title ?? t("backoffice.dashboard.client") ?? "").toString();
  const displayLabel = guessGenderPrefixFromName(firstName)
    ? `${guessGenderPrefixFromName(firstName)} ${capitalizeName(lastNameSafe)}`
    : capitalizeName(lastNameSafe);

  const timeLabelRaw = formatScheduledTimeOnly(iv);
  const timeLabel =
    typeof timeLabelRaw === "string" && timeLabelRaw.includes(".")
      ? String(t(timeLabelRaw))
      : timeLabelRaw;

  const handleAccept = async () => {
    if (!firestore || isUpdating) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(firestore, "interventions", iv.id), acceptTechnicianAssignmentPatch());
      toast.success(String(t("technician_hub.dashboard.detail.assignment_accepted")));
    } catch (err) {
      console.error(err);
      toast.error(String(t("technician_hub.dashboard.detail.assignment_action_failed")));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecline = async () => {
    if (!firestore || isUpdating) return;
    setIsUpdating(true);
    try {
      await updateDoc(
        doc(firestore, "interventions", iv.id),
        declineTechnicianAssignmentPatch(technicianUid),
      );
      toast.success(String(t("technician_hub.dashboard.detail.assignment_declined")));
    } catch (err) {
      console.error(err);
      toast.error(String(t("technician_hub.dashboard.detail.assignment_action_failed")));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      style={outfit}
      data-testid={`technician-assignment-offer-${iv.id}`}
      className={cn(
        "w-full rounded-[20px] border px-4 py-3 transition-all",
        isSelected
          ? "border-amber-300 bg-amber-50/95 ring-1 ring-amber-200 shadow-[0_14px_32px_-10px_rgba(245,158,11,0.35)]"
          : "border-amber-200/90 bg-amber-50/80 shadow-[0_8px_24px_-8px_rgba(245,158,11,0.2)]",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <p className="text-center text-[10px] font-bold uppercase tracking-wide text-amber-900">
        {t("technician_hub.dashboard.detail.new_assignment")}
      </p>
      <p className="mt-1 text-center text-[14px] font-bold text-slate-900">{displayLabel}</p>
      <p className="text-center text-[12px] font-semibold text-amber-950/80">{timeLabel}</p>

      <div className="mt-3 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          data-testid="technician-assignment-decline"
          disabled={isUpdating}
          onClick={() => void handleDecline()}
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[16px] border border-slate-200 bg-white px-2 text-[14px] font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-70"
        >
          <X className="h-4 w-4 shrink-0" aria-hidden />
          {isUpdating
            ? t("technician_hub.dashboard.detail.updating")
            : t("technician_hub.dashboard.detail.decline_assignment")}
        </button>
        <button
          type="button"
          data-testid="technician-assignment-accept"
          disabled={isUpdating}
          onClick={() => void handleAccept()}
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[16px] bg-blue-600 px-2 text-[14px] font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {isUpdating
            ? t("technician_hub.dashboard.detail.updating")
            : t("technician_hub.dashboard.detail.accept_assignment")}
        </button>
      </div>
    </motion.div>
  );
}
