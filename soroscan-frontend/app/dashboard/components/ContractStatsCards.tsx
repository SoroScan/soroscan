"use client";

import { useMemo } from "react";
import type { EventRecord } from "@/components/ingest/types";
import styles from "./ContractStatsCards.module.css";

interface Props {
  events: EventRecord[];
  totalCount: number;
  loading: boolean;
}

export function ContractStatsCards({ events, totalCount, loading }: Props) {
  const stats = useMemo(() => {
    if (!events.length) {
      return { eventsPerHour: 0, latestEventTime: null, eventTypesCount: 0 };
    }

    // Events per hour: count events in the last 60 minutes
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const eventsPerHour = events.filter(
      (e) => new Date(e.timestamp).getTime() >= oneHourAgo
    ).length;

    // Latest event time
    const sorted = [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latestEventTime = sorted[0]?.timestamp ?? null;

    // Unique event types
    const eventTypesCount = new Set(events.map((e) => e.eventType)).size;

    return { eventsPerHour, latestEventTime, eventTypesCount };
  }, [events]);

  const cards = [
    {
      label: "Total Events",
      value: loading ? "—" : totalCount.toLocaleString(),
      icon: "◈",
      accent: "#00ff9c",
    },
    {
      label: "Events / Hour",
      value: loading ? "—" : stats.eventsPerHour.toLocaleString(),
      icon: "⏱",
      accent: "#00d4ff",
    },
    {
      label: "Latest Event",
      value: loading
        ? "—"
        : stats.latestEventTime
        ? new Date(stats.latestEventTime).toLocaleTimeString()
        : "N/A",
      icon: "◉",
      accent: "#a78bfa",
    },
    {
      label: "Event Types",
      value: loading ? "—" : stats.eventTypesCount.toLocaleString(),
      icon: "⬡",
      accent: "#f59e0b",
    },
  ];

  return (
    <div className={styles.statsGrid} aria-label="Contract statistics">
      {cards.map((card) => (
        <div key={card.label} className={styles.statCard} style={{ "--accent": card.accent } as React.CSSProperties}>
          <span className={styles.statIcon} aria-hidden="true">{card.icon}</span>
          <span className={styles.statValue}>{card.value}</span>
          <span className={styles.statLabel}>{card.label}</span>
        </div>
      ))}
    </div>
  );
}
