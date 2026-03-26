"use client";

import { useRouter } from "next/navigation";
import type { NotificationItem as NotificationItemType } from "./useNotifications";

const TYPE_LABELS: Record<string, string> = {
  contract_paused: "CONTRACT",
  webhook_failure: "WEBHOOK",
  rate_limit: "RATE LIMIT",
  system: "SYSTEM",
  alert: "ALERT",
};

const TYPE_COLORS: Record<string, string> = {
  contract_paused: "text-terminal-yellow border-terminal-yellow",
  webhook_failure: "text-terminal-danger border-terminal-danger",
  rate_limit: "text-terminal-cyan border-terminal-cyan",
  system: "text-terminal-green border-terminal-green",
  alert: "text-terminal-yellow border-terminal-yellow",
};

interface Props {
  notification: NotificationItemType;
  onMarkRead: (id: number) => void;
}

export function NotificationItem({ notification, onMarkRead }: Props) {
  const router = useRouter();
  const colorClass = TYPE_COLORS[notification.notificationType] ?? "text-terminal-green border-terminal-green";
  const label = TYPE_LABELS[notification.notificationType] ?? notification.notificationType.toUpperCase();

  const relativeTime = formatRelative(notification.createdAt);

  const handleClick = () => {
    if (!notification.isRead) onMarkRead(notification.id);
    if (notification.link) router.push(notification.link);
  };

  return (
    <div
      role="listitem"
      onClick={handleClick}
      className={`
        relative flex gap-3 px-4 py-3 border-b border-terminal-green/20
        cursor-pointer transition-colors duration-150
        hover:bg-terminal-green/5
        ${!notification.isRead ? "bg-terminal-green/[0.03]" : ""}
      `}
      aria-label={`${label}: ${notification.title}`}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <span
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-terminal-green"
          aria-hidden="true"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-terminal-mono border px-1 py-px ${colorClass}`}>
            {label}
          </span>
          <span className="text-[10px] text-terminal-green/50 font-terminal-mono ml-auto shrink-0">
            {relativeTime}
          </span>
        </div>
        <p className="text-xs font-terminal-mono text-terminal-green truncate">{notification.title}</p>
        <p className="text-[11px] text-terminal-green/60 font-terminal-mono mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
