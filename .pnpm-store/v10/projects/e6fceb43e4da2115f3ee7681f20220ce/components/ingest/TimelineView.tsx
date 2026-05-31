"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ExportEventsModal } from "@/components/ingest/ExportEventsModal";
import {
  fetchContract,
  fetchEventTypes,
  fetchTimeline,
} from "@/components/ingest/graphql";
import {
  formatDateOnly,
  formatDateTime,
  shortHash,
  trimPayload,
} from "@/components/ingest/formatters";
import styles from "@/components/ingest/ingest-terminal.module.css";
import type {
  EventTimelineGroup,
  EventTimelineResult,
  TimelineBucketSize,
} from "@/components/ingest/types";

const BUCKETS: TimelineBucketSize[] = [
  "ONE_DAY",
  "ONE_HOUR",
  "THIRTY_MINUTES",
  "FIVE_MINUTES",
];

const BUCKET_LABELS: Record<TimelineBucketSize, string> = {
  ONE_DAY: "1 day",
  ONE_HOUR: "1 hour",
  THIRTY_MINUTES: "30 minutes",
  FIVE_MINUTES: "5 minutes",
};

interface StatusState {
  message: string;
  isError: boolean;
}

export function TimelineView({ contractId }: { contractId: string }) {
  const [contractName, setContractName] = useState(contractId);
  const [isContractMissing, setIsContractMissing] = useState(false);
  const [bucketIndex, setBucketIndex] = useState(2);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [timeline, setTimeline] = useState<EventTimelineResult | null>(null);
  const [status, setStatus] = useState<StatusState>({
    message: "Loading timeline data...",
    isError: false,
  });
  const [isExportOpen, setIsExportOpen] = useState(false);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  useEffect(() => {
    let active = true;

    const loadContract = async () => {
      try {
        const contract = await fetchContract(contractId);
        if (!active) {
          return;
        }

        if (!contract) {
          setIsContractMissing(true);
          setContractName(contractId);
          return;
        }

        setIsContractMissing(false);
        setContractName(contract.name || contractId);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load contract details.";
        setStatus({ message, isError: true });
      }
    };

    void loadContract();

    return () => {
      active = false;
    };
  }, [contractId]);

  useEffect(() => {
    let active = true;

    const loadTypes = async () => {
      setStatus({ message: "Loading event type filters...", isError: false });

      try {
        const types = await fetchEventTypes(contractId);
        if (!active) {
          return;
        }

        setEventTypes(types);
        setStatus({ message: "Event type filters loaded.", isError: false });
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load event type filters.";
        setStatus({ message, isError: true });
      }
    };

    void loadTypes();

    return () => {
      active = false;
    };
  }, [contractId]);

  useEffect(() => {
    let active = true;

    const loadTimelineData = async () => {
      setStatus({ message: "Loading timeline...", isError: false });

      try {
        const selectedBucket = BUCKETS[bucketIndex];
        const result = await fetchTimeline({
          contractId,
          bucketSize: selectedBucket,
          eventTypes: selectedEventTypes.length ? selectedEventTypes : null,
          timezone,
          includeEvents: true,
          limitGroups: 500,
        });

        if (!active) {
          return;
        }

        setTimeline(result);
        setStatus({ message: "Timeline loaded.", isError: false });
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error ? caughtError.message : "Timeline unavailable.";
        setTimeline(null);
        setStatus({ message, isError: true });
      }
    };

    void loadTimelineData();

    return () => {
      active = false;
    };
  }, [contractId, bucketIndex, selectedEventTypes, timezone]);

  const selectedBucket = BUCKETS[bucketIndex];

  const summaryText = timeline
    ? `${timeline.totalEvents} events across ${timeline.groups.length} groups (${formatDateTime(
        timeline.since,
      )} to ${formatDateTime(timeline.until)})`
    : isContractMissing
      ? "Contract not found."
      : "Timeline unavailable.";

  const toggleEventType = (eventType: string, checked: boolean) => {
    setSelectedEventTypes((current) => {
      if (checked) {
        if (current.includes(eventType)) {
          return current;
        }
        return [...current, eventType];
      }
      return current.filter((item) => item !== eventType);
    });
  };

  const clearFilters = () => {
    setSelectedEventTypes([]);
    setExpandedGroups(new Set());
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <main className={styles.timelineApp}>
        <header className={styles.hero}>
          <p className={styles.kicker}>SoroScan Contract Event History</p>
          <h1 className={styles.title}>{contractName}</h1>
          <p className={styles.contractId}>{contractId}</p>
          <div className={`${styles.row} ${styles.topActions}`}>
            <Link
              href={`/contracts/${encodeURIComponent(contractId)}/events/explorer`}
              className={`${styles.btn} ${styles.secondaryBtn} ${styles.linkBtn}`}
            >
              Open Event Explorer
            </Link>
          </div>
        </header>

        <section className={styles.controls} aria-label="Timeline controls">
          <div className={styles.controlCard}>
            <h2 className={styles.sectionTitle}>Zoom</h2>
            <div className={styles.row}>
              <button
                id="zoom-out"
                type="button"
                className={styles.btn}
                onClick={() => setBucketIndex((value) => Math.max(0, value - 1))}
                disabled={bucketIndex <= 0}
              >
                Zoom Out
              </button>
              <span id="zoom-level" className={styles.pill} aria-live="polite">
                {BUCKET_LABELS[selectedBucket]}
              </span>
              <button
                id="zoom-in"
                type="button"
                className={styles.btn}
                onClick={() => setBucketIndex((value) => Math.min(BUCKETS.length - 1, value + 1))}
                disabled={bucketIndex >= BUCKETS.length - 1}
              >
                Zoom In
              </button>
            </div>
          </div>

          <div className={styles.controlCard}>
            <h2 className={styles.sectionTitle}>Filter by Event Type</h2>
            <div className={styles.filterGrid} aria-live="polite">
              {eventTypes.length ? (
                eventTypes.map((eventType) => (
                  <label key={eventType} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      value={eventType}
                      checked={selectedEventTypes.includes(eventType)}
                      onChange={(event) => toggleEventType(eventType, event.target.checked)}
                    />
                    <span>{eventType}</span>
                  </label>
                ))
              ) : (
                <p className={styles.summary}>No event types found for this contract.</p>
              )}
            </div>
            <button
              id="clear-filters"
              type="button"
              className={`${styles.btn} ${styles.secondaryBtn}`}
              onClick={clearFilters}
              disabled={!selectedEventTypes.length}
            >
              Clear Filters
            </button>
          </div>

          <div className={styles.controlCard}>
            <h2 className={styles.sectionTitle}>Export</h2>
            <div className={styles.row}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => setIsExportOpen(true)}
                disabled={isContractMissing}
              >
                Export Events
              </button>
            </div>
          </div>
        </section>

        <section className={styles.timelinePanel} aria-label="Event timeline">
          <div className={styles.panelHead}>
            <h2 className={styles.sectionTitle}>Timeline</h2>
            <p className={styles.summary}>{summaryText}</p>
          </div>

          <div className={`${styles.status} ${status.isError ? styles.error : ""}`} aria-live="polite">
            {status.message}
          </div>

          <div className={styles.groups} role="tree">
            {!timeline || !timeline.groups.length ? (
              <p className={styles.summary}>
                {isContractMissing
                  ? "This contract does not exist in the indexed registry."
                  : "No events found in the selected filter and zoom range."}
              </p>
            ) : (
              timeline.groups.map((group, index) => (
                <TimelineGroupRow
                  key={group.start}
                  index={index}
                  groups={timeline.groups}
                  group={group}
                  bucketSize={selectedBucket}
                  expanded={expandedGroups.has(group.start)}
                  onToggle={() => toggleGroup(group.start)}
                />
              ))
            )}
          </div>
        </section>
      </main>

      <ExportEventsModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        contractId={contractId}
        initialFilters={{
          eventTypes: selectedEventTypes,
          since: timeline?.since ?? null,
          until: timeline?.until ?? null,
        }}
        onStatus={(message, isError = false) =>
          setStatus({
            message,
            isError,
          })
        }
      />
    </div>
  );
}

function TimelineGroupRow({
  index,
  groups,
  group,
  bucketSize,
  expanded,
  onToggle,
}: {
  index: number;
  groups: EventTimelineGroup[];
  group: EventTimelineGroup;
  bucketSize: TimelineBucketSize;
  expanded: boolean;
  onToggle: () => void;
}) {
  const branch = index === groups.length - 1 ? "\\--" : "|--";

  return (
    <article className={styles.group}>
      <button
        type="button"
        className={styles.groupToggle}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <div className={styles.groupHeaderLine}>
          <span className={styles.branch}>{`${expanded ? "[-]" : "[+]"} ${branch}`}</span>
          <span className={styles.range}>{formatRange(group.start, group.end, bucketSize)}</span>
        </div>

        <div className={styles.groupHeaderLine}>
          <span className={styles.counts}>{formatTypeCounts(group.eventTypeCounts)}</span>
          <span className={styles.totalCount}>{group.eventCount} events</span>
        </div>
      </button>

      <div className={`${styles.groupEvents} ${expanded ? "" : styles.hidden}`}>
        {!group.events.length ? (
          <div className={styles.eventRow}>No event details in this group.</div>
        ) : (
          group.events.map((event) => (
            <div key={event.id} className={styles.eventRow}>
              <div>
                {`|   |-- ${formatDateTime(event.timestamp)} [${event.eventType}] ledger ${event.ledger} tx ${shortHash(event.txHash)}`}
              </div>
              <code className={styles.eventCode}>{trimPayload(event.payload)}</code>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function formatTypeCounts(typeCounts: { eventType: string; count: number }[]): string {
  if (!typeCounts.length) {
    return "No categorized events";
  }

  return typeCounts.map((item) => `[${item.eventType}] ${item.count}`).join(", ");
}

function formatRange(start: string, end: string, bucketSize: TimelineBucketSize): string {
  if (bucketSize === "ONE_DAY") {
    return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
  }

  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}
