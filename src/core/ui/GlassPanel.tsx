"use client";

import type { ElementType, HTMLAttributes, ReactNode } from "react";
import {
  DASHBOARD_PANEL_INNER_CLIP_CLASS,
  PANEL_GLASS_DATA_ATTR,
  PANEL_GLASS_INNER_DATA_ATTR,
  PANEL_SHADOW_HOVER_DATA_ATTR,
  glassPanelShellClass,
  type GlassPanelShellOptions,
} from "@/core/ui/glassPanelChrome";
import { cn } from "@/lib/utils";

export type GlassPanelProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  /** Merged with default shell chrome when `shellPreset` is set */
  shellClassName?: string;
  /** Preset shell builder options (ignored when `shellClassName` fully replaces shell) */
  shellPreset?: GlassPanelShellOptions;
  innerClassName?: string;
  shadowHover?: boolean;
  "data-testid"?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

/**
 * Standard glass panel: outer shell (shadow) + inner clip (scroll).
 * New dashboard panels should use this component so shadows stay consistent.
 */
export default function GlassPanel<T extends ElementType = "div">({
  as,
  children,
  shellClassName,
  shellPreset,
  innerClassName,
  shadowHover = false,
  className,
  "data-testid": dataTestId,
  ...rest
}: GlassPanelProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const shell =
    shellClassName ??
    glassPanelShellClass(shellPreset);

  return (
    <Tag
      {...{ [PANEL_GLASS_DATA_ATTR]: "" }}
      {...(shadowHover ? { [PANEL_SHADOW_HOVER_DATA_ATTR]: "" } : {})}
      data-testid={dataTestId}
      className={cn(shell, className)}
      {...rest}
    >
      <div
        {...{ [PANEL_GLASS_INNER_DATA_ATTR]: "" }}
        className={cn(DASHBOARD_PANEL_INNER_CLIP_CLASS, innerClassName)}
      >
        {children}
      </div>
    </Tag>
  );
}
