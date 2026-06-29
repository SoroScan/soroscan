"use client";

import { useState, useEffect } from "react";
import { fetchEventTypes } from "@/components/ingest/graphql";
import styles from "@/components/ingest/ingest-terminal.module.css";

interface FilterBarProps {
  contracts: Array<{ contractId: string; name: string }>;
  filters: {
    contractId: string;
    eventType: string;
    since: string;
    until: string;
    searchQuery: string;
    tags: string[];
  };
  onFilterChange: (filters: Partial<FilterBarProps["filters"]>) => void;
  onExport: (format: "csv" | "json") => void;
  tagSuggestions: string[];
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

export function FilterBar({ contracts, filters, onFilterChange, onExport, tagSuggestions }: FilterBarProps) {
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [localFilters, setLocalFilters] = useState(filters);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!filters.contractId) {
      setEventTypes([]);
      return;
    }

    const loadEventTypes = async () => {
      try {
        const types = await fetchEventTypes(filters.contractId);
        setEventTypes(types);
      } catch (err) {
        console.error("Failed to load event types:", err);
        setEventTypes([]);
      }
    };

    loadEventTypes();
  }, [filters.contractId]);

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleClear = () => {
    const cleared = {
      contractId: "",
      eventType: "",
      since: "",
      until: "",
      searchQuery: "",
      tags: [],
    };
    setLocalFilters(cleared);
    setTagInput("");
    onFilterChange(cleared);
  };

  const handleAddTagFilter = () => {
    const normalized = normalizeTag(tagInput);
    if (!normalized) {
      return;
    }

    setLocalFilters((prev) => {
      if (prev.tags.includes(normalized)) {
        return prev;
      }
      return { ...prev, tags: [...prev.tags, normalized] };
    });
    setTagInput("");
  };

  const handleRemoveTagFilter = (tagToRemove: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  return (
    <section className={styles.controls} aria-label="Event filters">
      <div className={styles.controlCard}>
        <h2 className={styles.sectionTitle}>Filters</h2>
        
        <div className={styles.controlGrid}>
          <label className={styles.fieldRow} htmlFor="contract-select">
            <span>Contract</span>
            <select
              id="contract-select"
              className={styles.fieldInput}
              value={localFilters.contractId}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, contractId: e.target.value, eventType: "" }))
              }
            >
              <option value="">All Contracts</option>
              {contracts.map((contract) => (
                <option key={contract.contractId} value={contract.contractId}>
                  {contract.name || contract.contractId}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldRow} htmlFor="event-type-select">
            <span>Event Type</span>
            <select
              id="event-type-select"
              className={styles.fieldInput}
              value={localFilters.eventType}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, eventType: e.target.value }))
              }
              disabled={!localFilters.contractId}
            >
              <option value="">All Types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldRow} htmlFor="date-since">
            <span>From</span>
            <input
              id="date-since"
              className={styles.fieldInput}
              type="datetime-local"
              value={localFilters.since}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, since: e.target.value }))
              }
            />
          </label>

          <label className={styles.fieldRow} htmlFor="date-until">
            <span>To</span>
            <input
              id="date-until"
              className={styles.fieldInput}
              type="datetime-local"
              value={localFilters.until}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, until: e.target.value }))
              }
            />
          </label>

          <label className={styles.fieldRow} htmlFor="tag-filter-input">
            <span>Tag Filter</span>
            <div style={{ display: "flex", gap: "0.45rem" }}>
              <input
                id="tag-filter-input"
                className={styles.fieldInput}
                list="event-tag-suggestions"
                placeholder="add tag filter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTagFilter();
                  }
                }}
              />
              <button
                type="button"
                className={styles.btn}
                style={{ padding: "0.45rem 0.75rem", minWidth: "auto" }}
                onClick={handleAddTagFilter}
                title="Add tag filter"
              >
                +
              </button>
            </div>
            <datalist id="event-tag-suggestions">
              {tagSuggestions.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            {!!localFilters.tags.length && (
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {localFilters.tags.map((tag) => (
                  <span key={tag} className={styles.pill}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTagFilter(tag)}
                      style={{
                        background: "transparent",
                        border: 0,
                        color: "inherit",
                        marginLeft: "0.35rem",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      title={`Remove ${tag}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </label>
        </div>


        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={handleApply}>
            Apply Filters
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondaryBtn}`}
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondaryBtn}`}
            onClick={() => onExport("csv")}
          >
            Export CSV
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondaryBtn}`}
            onClick={() => onExport("json")}
          >
            Export JSON
          </button>
        </div>
      </div>
    </section>
  );
}
