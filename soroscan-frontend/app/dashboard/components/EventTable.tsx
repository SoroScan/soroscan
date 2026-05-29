"use client";

import { useState } from "react";
import { formatDateTime, shortHash } from "@/components/ingest/formatters";
import type { EventRecord } from "@/components/ingest/types";
import styles from "@/components/ingest/ingest-terminal.module.css";

interface EventTableProps {
  events: EventRecord[];
  loading: boolean;
  onEventClick: (event: EventRecord) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function EventTable({ events, loading, onEventClick, hasActiveFilters, onClearFilters }: EventTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getEventTypeColor = (eventType: string): string => {
    const hash = eventType.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "rgba(0, 255, 156, 0.8)",
      "rgba(0, 212, 255, 0.8)",
      "rgba(255, 170, 0, 0.8)",
      "rgba(255, 102, 255, 0.8)",
    ];
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <div className={styles.tableWrap}>
        <table className={styles.eventTable}>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Type</th>
              <th>Ledger</th>
              <th>Time</th>
              <th>Transaction</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <tr key={`skeleton-${index}`}>
                <td data-label="Contract">
                  <div className={styles.skeleton} style={{ width: "120px", height: "20px" }} />
                </td>
                <td data-label="Type">
                  <div className={styles.skeleton} style={{ width: "80px", height: "24px", borderRadius: "12px" }} />
                </td>
                <td data-label="Ledger">
                  <div className={styles.skeleton} style={{ width: "60px", height: "24px" }} />
                </td>
                <td data-label="Time">
                  <div className={styles.skeleton} style={{ width: "140px", height: "20px" }} />
                </td>
                <td data-label="Tx">
                  <div className={styles.skeleton} style={{ width: "100px", height: "20px" }} />
                </td>
                <td data-label="Actions">
                  <div className={styles.skeleton} style={{ width: "50px", height: "28px" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.eventTable}>
        <thead>
          <tr>
            <th>Contract</th>
            <th>Type</th>
            <th>Ledger</th>
            <th>Time</th>
            <th>Transaction</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {!events.length ? (
            <tr>
              <td colSpan={6} className={styles.emptyTable}>
                {loading ? (
                  "Loading events..."
                ) : hasActiveFilters ? (
                  <div style={{ padding: "3rem 1rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <div style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-primary)" }}>
                      No events match your criteria
                    </h3>
                    <p style={{ margin: 0, color: "var(--text-secondary)", maxWidth: "400px", lineHeight: 1.5 }}>
                      We couldn&apos;t find any events matching your current search and filter settings. Try adjusting them or clear all filters to see more results.
                    </p>
                    <button
                      type="button"
                      className={styles.btn}
                      style={{ marginTop: "1rem" }}
                      onClick={onClearFilters}
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  "No events found. Select a contract and adjust filters to view events."
                )}
              </td>
            </tr>
          ) : (
            events.map((event) => (
              <tr
                key={event.id}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 15px ${getEventTypeColor(event.eventType)}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <td data-label="Contract">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <code>{shortHash(event.contractId)}</code>
                    <button
                      type="button"
                      className={styles.btn}
                      style={{
                        padding: "0.2rem 0.4rem",
                        fontSize: "0.7rem",
                        minWidth: "auto",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(event.contractId, `contract-${event.id}`);
                      }}
                      title="Copy contract ID"
                    >
                      {copiedId === `contract-${event.id}` ? "✓" : "📋"}
                    </button>
                  </div>
                </td>
                <td data-label="Type">
                  <span
                    className={styles.pill}
                    style={{
                      borderColor: getEventTypeColor(event.eventType),
                      backgroundColor: `${getEventTypeColor(event.eventType)}15`,
                      color: getEventTypeColor(event.eventType),
                    }}
                  >
                    {event.eventType}
                  </span>
                </td>
                <td data-label="Ledger">
                  <button
                    type="button"
                    className={styles.btn}
                    style={{
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.75rem",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {event.ledger}
                  </button>
                </td>
                <td data-label="Time">{formatDateTime(event.timestamp)}</td>
                <td data-label="Tx">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <code>{shortHash(event.txHash)}</code>
                    <button
                      type="button"
                      className={styles.btn}
                      style={{
                        padding: "0.2rem 0.4rem",
                        fontSize: "0.7rem",
                        minWidth: "auto",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(event.txHash, `tx-${event.id}`);
                      }}
                      title="Copy transaction hash"
                    >
                      {copiedId === `tx-${event.id}` ? "✓" : "📋"}
                    </button>
                  </div>
                </td>
                <td data-label="Actions">
                  <button
                    type="button"
                    className={styles.btn}
                    style={{
                      padding: "0.3rem 0.6rem",
                      fontSize: "0.75rem",
                    }}
                    onClick={() => onEventClick(event)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}