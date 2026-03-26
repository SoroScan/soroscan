"use client";

import { useState } from "react";
import { NotificationDrawer } from "./NotificationDrawer";
import { useNotifications, type NotificationFilter } from "./useNotifications";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const { notifications, unreadCount, loading, markRead, markAllRead, clearAll } =
    useNotifications({ filter });

  const filteredNotifications =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.notificationType === filter);

  return (
    <>
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="
          relative flex items-center justify-center w-9 h-9
          border border-terminal-green/40 text-terminal-green/70
          hover:border-terminal-green hover:text-terminal-green
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-green
        "
      >
        {/* Bell SVG */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="
              absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5
              flex items-center justify-center
              bg-terminal-danger text-terminal-black text-[9px] font-bold
              rounded-none
            "
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={filteredNotifications}
        loading={loading}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
        filter={filter}
        onFilterChange={setFilter}
      />
    </>
  );
}
