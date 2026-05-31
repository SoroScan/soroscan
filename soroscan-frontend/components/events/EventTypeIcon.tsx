/**
 * EventTypeIcon
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps Soroban contract event types to distinctive lucide-react icons for
 * quick visual identification. Provides a consistent fallback for unknown types.
 *
 * Issue #571 — feat: add distinctive icons for each event type
 */
import React from "react";
import {
  ArrowLeftRight,
  Flame,
  Coins,
  ShieldCheck,
  Scissors,
  UserCog,
  UserCheck,
  Zap,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

/** All known Soroban / SEP event types */
export type KnownEventType =
  | "transfer"
  | "mint"
  | "burn"
  | "approve"
  | "clawback"
  | "set_admin"
  | "set_authorized";

export interface EventTypeIconProps extends Omit<LucideProps, "ref"> {
  /** The event type string coming from the API */
  eventType: string;
  /** Extra class names forwarded to the icon */
  className?: string;
}

/**
 * Map of known event types → lucide icon components.
 * Defined at module level so components are never created during render.
 */
const ICON_MAP: Record<KnownEventType, React.ComponentType<LucideProps>> = {
  transfer: ArrowLeftRight,
  mint: Coins,
  burn: Flame,
  approve: ShieldCheck,
  clawback: Scissors,
  set_admin: UserCog,
  set_authorized: UserCheck,
};

/**
 * Fallback icon for any event type not in ICON_MAP.
 * Defined at module level — never recreated during render.
 */
const FallbackIcon: React.ComponentType<LucideProps> = Zap;

/**
 * Returns the icon component for a given event type.
 * Safe to call with any string — unknown types get the fallback.
 */
export function getEventTypeIcon(
  eventType: string
): React.ComponentType<LucideProps> {
  return ICON_MAP[eventType as KnownEventType] ?? FallbackIcon;
}

/**
 * Renders the appropriate icon for an event type.
 *
 * @example
 * <EventTypeIcon eventType="transfer" size={16} className="text-terminal-cyan" />
 * <EventTypeIcon eventType="unknown_custom_event" size={16} />
 */
export function EventTypeIcon({
  eventType,
  size = 16,
  className,
  ...rest
}: EventTypeIconProps) {
  return React.createElement(getEventTypeIcon(eventType), {
    size,
    className,
    "aria-label": `${eventType} event`,
    role: "img",
    ...rest,
  });
}
