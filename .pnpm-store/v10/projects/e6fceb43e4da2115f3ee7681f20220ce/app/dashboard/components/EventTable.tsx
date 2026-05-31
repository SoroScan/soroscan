"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateTime, shortHash } from "@/components/ingest/formatters";
import type { EventRecord } from "@/components/ingest/types";
import styles from "@/components/ingest/ingest-terminal.module.css";

interface EventTableProps {
  events: EventRecord[];
  loading: boolean;
  onEventClick: (event: EventRecord) => void;
}

export function EventTable({ events, loading, onEventClick }: EventTableProps) {
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

  const getContractBadgeColor = (contractId: string): string => {
    const hash = contractId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "rgba(0, 255, 156, 0.82)",
      "rgba(0, 212, 255, 0.82)",
      "rgba(255, 170, 0, 0.82)",
      "rgba(255, 102, 255, 0.82)",
      "rgba(156, 163, 255, 0.82)",
    ];
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <div className={styles.tableWrap}>
        <div className={styles.status}>Loading events...</div>
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
                {loading
                  ? "Loading events..."
                  : "No events found. Select a contract and adjust filters to view events."}
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
                  <div className={styles.contractBadgeRow}>
                    <Link
                      href={`/contracts/${encodeURIComponent(event.contractId)}`}
                      className={styles.contractBadge}
                      style={{
                        borderColor: getContractBadgeColor(event.contractId),
                        backgroundColor: `${getContractBadgeColor(event.contractId)}18`,
                        color: getContractBadgeColor(event.contractId),
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Open contract ${event.contractName || event.contractId}`}
                    >
                      <span
                        className={styles.contractBadgeDot}
                        style={{ backgroundColor: getContractBadgeColor(event.contractId) }}
                        aria-hidden="true"
                      />
                      <span className={styles.contractBadgeText}>
                        <span className={styles.contractBadgeName}>
                          {event.contractName || shortHash(event.contractId)}
                        </span>
                        {event.contractName && (
                          <code className={styles.contractBadgeId}>
                            {shortHash(event.contractId)}
                          </code>
                        )}
                      </span>
                    </Link>
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
