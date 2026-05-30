"use client";

import { useState } from "react";
import { formatDateTime, shortHash } from "@/components/ingest/formatters";
import type { EventRecord } from "@/components/ingest/types";
import styles from "@/components/ingest/ingest-terminal.module.css";

interface EventTableProps {
  events: EventRecord[];
  loading: boolean;
  onEventClick: (event: EventRecord) => void;
  eventTags: Record<string, string[]>;
  tagSuggestions: string[];
  onAddTag: (eventId: string, tag: string) => void;
  onRemoveTag: (eventId: string, tag: string) => void;
}

export function EventTable({
  events,
  loading,
  onEventClick,
  eventTags,
  tagSuggestions,
  onAddTag,
  onRemoveTag,
}: EventTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

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
            <th>Tags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {!events.length ? (
            <tr>
              <td colSpan={7} className={styles.emptyTable}>
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
                <td data-label="Tags">
                  <div style={{ display: "grid", gap: "0.4rem" }}>
                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                      {(eventTags[event.id] ?? []).map((tag) => (
                        <span key={tag} className={styles.pill} style={{ fontSize: "0.72rem", padding: "0.2rem 0.45rem" }}>
                          {tag}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveTag(event.id, tag);
                            }}
                            style={{
                              background: "transparent",
                              border: 0,
                              color: "inherit",
                              cursor: "pointer",
                              marginLeft: "0.3rem",
                              padding: 0,
                            }}
                            title={`Remove ${tag}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <input
                        className={styles.fieldInput}
                        list={`event-tag-suggestions-${event.id}`}
                        value={tagInputs[event.id] ?? ""}
                        placeholder="add tag"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTagInputs((prev) => ({ ...prev, [event.id]: value }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            const value = tagInputs[event.id] ?? "";
                            onAddTag(event.id, value);
                            setTagInputs((prev) => ({ ...prev, [event.id]: "" }));
                          }
                        }}
                        style={{ padding: "0.35rem 0.45rem", fontSize: "0.75rem" }}
                      />
                      <button
                        type="button"
                        className={styles.btn}
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", minWidth: "auto" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const value = tagInputs[event.id] ?? "";
                          onAddTag(event.id, value);
                          setTagInputs((prev) => ({ ...prev, [event.id]: "" }));
                        }}
                        title="Add tag"
                      >
                        +
                      </button>
                    </div>
                    <datalist id={`event-tag-suggestions-${event.id}`}>
                      {tagSuggestions.map((tag) => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
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