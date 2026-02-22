(() => {
  const BUCKETS = ["ONE_DAY", "ONE_HOUR", "THIRTY_MINUTES", "FIVE_MINUTES"];
  const BUCKET_LABELS = {
    ONE_DAY: "1 day",
    ONE_HOUR: "1 hour",
    THIRTY_MINUTES: "30 minutes",
    FIVE_MINUTES: "5 minutes",
  };

  const EVENT_TYPES_QUERY = `
    query EventTypes($contractId: String!) {
      eventTypes(contractId: $contractId)
    }
  `;

  const EVENT_TIMELINE_QUERY = `
    query EventTimeline(
      $contractId: String!
      $bucketSize: TimelineBucketSize!
      $eventTypes: [String!]
      $timezone: String!
      $includeEvents: Boolean!
      $limitGroups: Int!
    ) {
      eventTimeline(
        contractId: $contractId
        bucketSize: $bucketSize
        eventTypes: $eventTypes
        timezone: $timezone
        includeEvents: $includeEvents
        limitGroups: $limitGroups
      ) {
        contractId
        bucketSize
        since
        until
        totalEvents
        groups {
          start
          end
          eventCount
          eventTypeCounts {
            eventType
            count
          }
          events {
            id
            eventType
            ledger
            eventIndex
            timestamp
            txHash
            payload
          }
        }
      }
    }
  `;

  const app = document.querySelector(".timeline-app");
  if (!app) {
    return;
  }

  const state = {
    contractId: app.dataset.contractId,
    contractName: app.dataset.contractName,
    bucketIndex: 2,
    selectedEventTypes: new Set(),
    expandedGroups: new Set(),
    timeline: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };

  const elements = {
    zoomLevel: document.getElementById("zoom-level"),
    zoomIn: document.getElementById("zoom-in"),
    zoomOut: document.getElementById("zoom-out"),
    clearFilters: document.getElementById("clear-filters"),
    exportJson: document.getElementById("export-json"),
    exportCsv: document.getElementById("export-csv"),
    filters: document.getElementById("event-type-filters"),
    summary: document.getElementById("timeline-summary"),
    status: document.getElementById("timeline-status"),
    groups: document.getElementById("timeline-groups"),
  };

  function init() {
    bindControls();
    updateZoomState();
    void loadAll();
  }

  function bindControls() {
    elements.zoomIn.addEventListener("click", () => {
      if (state.bucketIndex >= BUCKETS.length - 1) {
        return;
      }
      state.bucketIndex += 1;
      updateZoomState();
      void loadTimeline();
    });

    elements.zoomOut.addEventListener("click", () => {
      if (state.bucketIndex <= 0) {
        return;
      }
      state.bucketIndex -= 1;
      updateZoomState();
      void loadTimeline();
    });

    elements.clearFilters.addEventListener("click", () => {
      if (state.selectedEventTypes.size === 0) {
        return;
      }
      state.selectedEventTypes.clear();
      renderFilters([]);
      void loadEventTypes();
      void loadTimeline();
    });

    elements.exportJson.addEventListener("click", () => {
      if (!state.timeline) {
        setStatus("No timeline data to export.", true);
        return;
      }
      const filename = buildExportFilename("json");
      downloadBlob(filename, "application/json", JSON.stringify(state.timeline, null, 2));
      setStatus(`Exported ${filename}`);
    });

    elements.exportCsv.addEventListener("click", () => {
      if (!state.timeline) {
        setStatus("No timeline data to export.", true);
        return;
      }
      const filename = buildExportFilename("csv");
      downloadBlob(filename, "text/csv;charset=utf-8", timelineToCsv(state.timeline));
      setStatus(`Exported ${filename}`);
    });
  }

  async function loadAll() {
    await loadEventTypes();
    await loadTimeline();
  }

  async function loadEventTypes() {
    setStatus("Loading event type filters...");
    try {
      const payload = await graphqlRequest(EVENT_TYPES_QUERY, {
        contractId: state.contractId,
      });
      const eventTypes = payload.data.eventTypes || [];
      renderFilters(eventTypes);
      setStatus("Event type filters loaded.");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function renderFilters(eventTypes) {
    elements.filters.innerHTML = "";

    if (!eventTypes.length) {
      const fallback = document.createElement("p");
      fallback.textContent = "No event types found for this contract.";
      fallback.className = "summary";
      elements.filters.appendChild(fallback);
      return;
    }

    eventTypes.forEach((eventType) => {
      const wrapper = document.createElement("label");
      wrapper.className = "filter-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = eventType;
      input.checked = state.selectedEventTypes.has(eventType);
      input.addEventListener("change", () => {
        if (input.checked) {
          state.selectedEventTypes.add(eventType);
        } else {
          state.selectedEventTypes.delete(eventType);
        }
        void loadTimeline();
      });

      const text = document.createElement("span");
      text.textContent = eventType;

      wrapper.appendChild(input);
      wrapper.appendChild(text);
      elements.filters.appendChild(wrapper);
    });
  }

  async function loadTimeline() {
    setStatus("Loading timeline...");
    elements.groups.innerHTML = "";

    const selectedBucket = BUCKETS[state.bucketIndex];
    const selectedTypes = state.selectedEventTypes.size > 0 ? Array.from(state.selectedEventTypes) : null;

    try {
      const payload = await graphqlRequest(EVENT_TIMELINE_QUERY, {
        contractId: state.contractId,
        bucketSize: selectedBucket,
        eventTypes: selectedTypes,
        timezone: state.timezone,
        includeEvents: true,
        limitGroups: 500,
      });

      const timeline = payload.data.eventTimeline;
      state.timeline = timeline;
      elements.summary.textContent = `${timeline.totalEvents} events across ${timeline.groups.length} groups (${formatDateTime(timeline.since)} to ${formatDateTime(timeline.until)})`;
      renderGroups(timeline.groups, selectedBucket);
      setStatus("Timeline loaded.");
    } catch (error) {
      state.timeline = null;
      elements.summary.textContent = "Timeline unavailable.";
      setStatus(error.message, true);
    }
  }

  function renderGroups(groups, bucketSize) {
    elements.groups.innerHTML = "";

    if (!groups.length) {
      const empty = document.createElement("p");
      empty.className = "summary";
      empty.textContent = "No events found in the selected filter and zoom range.";
      elements.groups.appendChild(empty);
      return;
    }

    groups.forEach((group, index) => {
      const key = group.start;
      const expanded = state.expandedGroups.has(key);
      const branch = index === groups.length - 1 ? "\\--" : "|--";

      const groupContainer = document.createElement("article");
      groupContainer.className = "group";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "group-toggle";
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");

      const lineOne = document.createElement("div");
      lineOne.className = "group-header-line";

      const branchSpan = document.createElement("span");
      branchSpan.className = "branch";
      branchSpan.textContent = `${expanded ? "[-]" : "[+]"} ${branch}`;

      const rangeSpan = document.createElement("span");
      rangeSpan.className = "range";
      rangeSpan.textContent = formatRange(group.start, group.end, bucketSize);

      lineOne.appendChild(branchSpan);
      lineOne.appendChild(rangeSpan);

      const lineTwo = document.createElement("div");
      lineTwo.className = "group-header-line";

      const countsSpan = document.createElement("span");
      countsSpan.className = "counts";
      countsSpan.textContent = formatTypeCounts(group.eventTypeCounts);

      const totalSpan = document.createElement("span");
      totalSpan.className = "total-count";
      totalSpan.textContent = `${group.eventCount} events`;

      lineTwo.appendChild(countsSpan);
      lineTwo.appendChild(totalSpan);

      toggle.appendChild(lineOne);
      toggle.appendChild(lineTwo);

      const eventsContainer = document.createElement("div");
      eventsContainer.className = `group-events${expanded ? "" : " hidden"}`;

      if (!group.events.length) {
        const row = document.createElement("div");
        row.className = "event-row";
        row.textContent = "No event details in this group.";
        eventsContainer.appendChild(row);
      } else {
        group.events.forEach((event) => {
          const row = document.createElement("div");
          row.className = "event-row";

          const header = document.createElement("div");
          header.textContent = `|   |-- ${formatDateTime(event.timestamp)} [${event.eventType}] ledger ${event.ledger} tx ${shortHash(event.txHash)}`;

          const payload = document.createElement("code");
          payload.textContent = trimPayload(event.payload);

          row.appendChild(header);
          row.appendChild(payload);
          eventsContainer.appendChild(row);
        });
      }

      toggle.addEventListener("click", () => {
        if (state.expandedGroups.has(key)) {
          state.expandedGroups.delete(key);
          eventsContainer.classList.add("hidden");
          toggle.setAttribute("aria-expanded", "false");
          branchSpan.textContent = `[+] ${branch}`;
        } else {
          state.expandedGroups.add(key);
          eventsContainer.classList.remove("hidden");
          toggle.setAttribute("aria-expanded", "true");
          branchSpan.textContent = `[-] ${branch}`;
        }
      });

      groupContainer.appendChild(toggle);
      groupContainer.appendChild(eventsContainer);
      elements.groups.appendChild(groupContainer);
    });
  }

  function updateZoomState() {
    const selectedBucket = BUCKETS[state.bucketIndex];
    elements.zoomLevel.textContent = BUCKET_LABELS[selectedBucket];
    elements.zoomOut.disabled = state.bucketIndex <= 0;
    elements.zoomIn.disabled = state.bucketIndex >= BUCKETS.length - 1;
  }

  function formatTypeCounts(typeCounts) {
    if (!typeCounts.length) {
      return "No categorized events";
    }
    return typeCounts.map((item) => `[${item.eventType}] ${item.count}`).join(", ");
  }

  function formatRange(start, end, bucketSize) {
    if (bucketSize === "ONE_DAY") {
      return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
    }
    return `${formatDateTime(start)} - ${formatDateTime(end)}`;
  }

  function formatDateTime(value) {
    const parsed = new Date(value);
    return parsed.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  function formatDateOnly(value) {
    const parsed = new Date(value);
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function shortHash(hash) {
    if (!hash || hash.length < 14) {
      return hash || "N/A";
    }
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  }

  function trimPayload(payload) {
    const raw = JSON.stringify(payload);
    if (!raw) {
      return "{}";
    }
    if (raw.length <= 180) {
      return raw;
    }
    return `${raw.slice(0, 177)}...`;
  }

  function buildExportFilename(extension) {
    const now = new Date();
    const stamp = now
      .toISOString()
      .replaceAll("-", "")
      .replaceAll(":", "")
      .replace("T", "_")
      .slice(0, 13);
    return `events_timeline_${state.contractId}_${stamp}.${extension}`;
  }

  function timelineToCsv(timeline) {
    const rows = [
      ["group_start", "group_end", "event_type", "count", "total_group_count"],
    ];

    timeline.groups.forEach((group) => {
      if (!group.eventTypeCounts.length) {
        rows.push([group.start, group.end, "", "0", String(group.eventCount)]);
        return;
      }
      group.eventTypeCounts.forEach((entry) => {
        rows.push([
          group.start,
          group.end,
          entry.eventType,
          String(entry.count),
          String(group.eventCount),
        ]);
      });
    });

    return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  }

  function escapeCsv(value) {
    if (value == null) {
      return "";
    }
    const str = String(value);
    if (/[,"\n]/.test(str)) {
      return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
  }

  function downloadBlob(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function setStatus(message, isError = false) {
    elements.status.textContent = message;
    elements.status.classList.toggle("error", Boolean(isError));
  }

  async function graphqlRequest(query, variables) {
    const response = await fetch("/graphql/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const payload = await response.json();

    if (payload.errors && payload.errors.length) {
      const messages = payload.errors.map((item) => item.message).join("; ");
      throw new Error(messages);
    }

    return payload;
  }

  function getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  }

  init();
})();
