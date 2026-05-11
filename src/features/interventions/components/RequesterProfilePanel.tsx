"use client";

import { useEffect } from "react";
import { Building2, MapPin, Phone, User, UserRound } from "lucide-react";
import ClientPortalAuthPanel from "@/features/auth/components/ClientPortalAuthPanel";
import { useRequesterHub, RequesterType } from "../context/RequesterHubContext";
import { GLASS_PANEL_BODY_SCROLL_COMPACT } from "@/core/ui/glassPanelChrome";
import { cn } from "@/lib/utils";
import { motion, useAnimation } from "framer-motion";
import { useTranslation } from "@/core/i18n/I18nContext";
const outfit = { fontFamily: "'Outfit', sans-serif" } as const;

const inputClass =
  "min-w-0 flex-1 rounded-[14px] border border-black/[0.06] bg-transparent px-3 py-2.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-900/15";

const iconRail =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-slate-500 shadow-[0_4px_14px_-6px_rgba(15,23,42,0.1)]";

const glassRow =
  "flex items-center gap-3 rounded-[20px] bg-white/85 px-3 py-2.5 backdrop-blur-sm shadow-[0_6px_20px_-8px_rgba(15,23,42,0.12)] transition-colors duration-300";

export default function RequesterProfilePanel() {
  const { profile, setProfile, validationFailedCount } = useRequesterHub();
  const { t } = useTranslation();
  const shakeControls = useAnimation();
  useEffect(() => {
    if (validationFailedCount > 0) {
      shakeControls.start({
        x: [0, -6, 6, -6, 6, 0],
        transition: { duration: 0.4 },
      });
    }
  }, [validationFailedCount, shakeControls]);

  const handleTypeChange = (type: RequesterType) => {
    setProfile((prev) => ({ ...prev, type }));
  };

  const isInvalid = (val: string) => validationFailedCount > 0 && !val.trim();

  return (
    <div data-testid="requester-profile-panel" style={outfit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`${GLASS_PANEL_BODY_SCROLL_COMPACT} flex flex-col gap-4`}>
        <div className="flex gap-2 rounded-[18px] bg-slate-200/45 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <button
            type="button"
            data-testid="requester-type-login"
            onClick={() => handleTypeChange("login")}
            className={cn(
              "flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[14px] text-[13px] font-bold transition-all",
              profile.type === "login"
                ? "bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)]"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Building2 className="h-4 w-4" />
            {t("requester.profile.type_login")}
          </button>
          <button
            type="button"
            data-testid="requester-type-particulier"
            onClick={() => handleTypeChange("particulier")}
            className={cn(
              "flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[14px] text-[13px] font-bold transition-all",
              profile.type === "particulier"
                ? "bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)]"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <UserRound className="h-4 w-4" />
            {t("requester.profile.type_individual")}
          </button>
        </div>

        {profile.type === "login" ? (
          <div data-testid="requester-login-rail" className="min-h-0 flex-1 flex flex-col overflow-hidden">
            <ClientPortalAuthPanel authRailMode />
          </div>
        ) : (
          <>
        <div className="flex flex-col gap-2.5 rounded-[24px] border border-black/[0.05] bg-white/70 p-3 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.2)]">
          <motion.div
            animate={isInvalid(profile.firstName) ? shakeControls : undefined}
            className={cn(glassRow, isInvalid(profile.firstName) && "ring-2 ring-red-500 bg-red-50/80")}
          >
            <span className={iconRail}>
              <User className={cn("h-5 w-5 opacity-70", isInvalid(profile.firstName) && "text-red-500 opacity-100")} />
            </span>
            <input
              type="text"
              placeholder={t("requester.profile.first_name")}
              value={profile.firstName}
              onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
              className={cn(inputClass, isInvalid(profile.firstName) && "placeholder:text-red-300")}
            />
          </motion.div>

          <motion.div
            animate={isInvalid(profile.lastName) ? shakeControls : undefined}
            className={cn(glassRow, isInvalid(profile.lastName) && "ring-2 ring-red-500 bg-red-50/80")}
          >
            <span className={iconRail}>
              <User className={cn("h-5 w-5 opacity-70", isInvalid(profile.lastName) && "text-red-500 opacity-100")} />
            </span>
            <input
              type="text"
              placeholder={t("requester.profile.last_name")}
              value={profile.lastName}
              onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
              className={cn(inputClass, isInvalid(profile.lastName) && "placeholder:text-red-300")}
            />
          </motion.div>
        </div>

        <div className="flex flex-col gap-2.5 rounded-[24px] border border-black/[0.05] bg-white/70 p-3 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.2)]">
          <motion.div
            animate={isInvalid(profile.phone) ? shakeControls : undefined}
            className={cn(glassRow, isInvalid(profile.phone) && "ring-2 ring-red-500 bg-red-50/80")}
          >
            <span className={iconRail}>
              <Phone className={cn("h-5 w-5 opacity-70", isInvalid(profile.phone) && "text-red-500 opacity-100")} />
            </span>
            <input
              type="tel"
              placeholder={t("requester.profile.phone")}
              value={profile.phone}
              onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
              className={cn(inputClass, isInvalid(profile.phone) && "placeholder:text-red-300")}
            />
          </motion.div>

          <motion.div
            animate={isInvalid(profile.defaultAddress) ? shakeControls : undefined}
            className={cn(glassRow, isInvalid(profile.defaultAddress) && "ring-2 ring-red-500 bg-red-50/80")}
          >
            <span className={iconRail}>
              <MapPin className={cn("h-5 w-5 opacity-70", isInvalid(profile.defaultAddress) && "text-red-500 opacity-100")} />
            </span>
            <input
              type="text"
              placeholder={t("requester.profile.usual_address")}
              value={profile.defaultAddress}
              onChange={(e) => setProfile((prev) => ({ ...prev, defaultAddress: e.target.value }))}
              className={cn(inputClass, isInvalid(profile.defaultAddress) && "placeholder:text-red-300")}
            />
          </motion.div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
