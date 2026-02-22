import { attachEventExport } from "./export-events.js";

(() => {
  const PAGE_SIZE = 50;

  const EVENT_TYPES_QUERY = `
    query EventTypes($contractId: String!) {
      eventTypes(contractId: $contractId)
    }
  `;

  const EVENTS_QUERY = `
    query ExplorerEvents(
      $contractId: String!
      $eventType: String
      $limit: Int!
      $offset: Int!
      $since: DateTime
      $until: DateTime
    ) {
      events(
        contractId: $contractId
        eventType: $eventType
        limit: $limit
        offset: $offset
        since: $since
        until: $until
      ) {
        id
        eventType
        ledger
        eventIndex
        timestamp
        txHash
        payload
      }
    }
  `;

  const app = document.querySelector(".explorer-app");
  if (!app) {
    return;
  }

  const state = {
    contractId: app.dataset.contractId,
    page: 1,
    selectedType: "",
    since: "",
    until: "",
    hasNext: false,
  };

  const elements = {
    eventTypeSelect: document.getElementById("event-type-select"),
    sinceInput: document.getElementById("date-since"),
    untilInput: document.getElementById("date-until"),
    applyFilters: document.getElementById("apply-filters"),
    clearFilters: document.getElementById("clear-filters"),
    tableBody: document.getElementById("events-table-body"),
    summary: document.getElementById("events-summary"),
    status: document.getElementById("events-status"),
    previousPage: document.getElementById("previous-page"),
    nextPage: document.getElementById("next-page"),
    pageIndicator: document.getElementById("page-indicator"),
    exportButton: document.getElementById("open-export-modal"),
  };

  function init() {
    bindControls();
    attachEventExport({
      trigger: elements.exportButton,
      contractId: state.contractId,
      getCurrentFilters: () => ({
        eventTypes: state.selectedType ? [state.selectedType] : [],
        since: state.since ? new Date(state.since).toISOString() : null,
        until: state.until ? new Date(state.until).toISOString() : null,
      }),
      onStatus: (message, isError) => setStatus(message, Boolean(isError)),
    });

    void loadEventTypes();
    void loadEvents();
  }

  function bindControls() {
    elements.applyFilters.addEventListener("click", () => {
      const validationError = validateDateRange(
        elements.sinceInput.value,
        elements.untilInput.value
      );
      if (validationError) {
        setStatus(validationError, true);
        return;
      }

      state.page = 1;
      state.selectedType = elements.eventTypeSelect.value;
      state.since = elements.sinceInput.value;
      state.until = elements.untilInput.value;
      void loadEvents();
    });

    elements.clearFilters.addEventListener("click", () => {
      state.page = 1;
      state.selectedType = "";
      state.since = "";
      state.until = "";

      elements.eventTypeSelect.value = "";
      elements.sinceInput.value = "";
      elements.untilInput.value = "";

      void loadEvents();
    });

    elements.previousPage.addEventListener("click", () => {
      if (state.page <= 1) {
        return;
      }
      state.page -= 1;
      void loadEvents();
    });

    elements.nextPage.addEventListener("click", () => {
      if (!state.hasNext) {
        return;
      }
      state.page += 1;
      void loadEvents();
    });
  }

  async function loadEventTypes() {
    setStatus("Loading event type options...");

    try {
      const payload = await graphqlRequest(EVENT_TYPES_QUERY, {
        contractId: state.contractId,
      });
      const types = payload.data.eventTypes || [];

      types.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        elements.eventTypeSelect.appendChild(option);
      });

      setStatus("Event type options loaded.");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadEvents() {
    setStatus("Loading events...");

    const offset = (state.page - 1) * PAGE_SIZE;

    try {
      const payload = await graphqlRequest(EVENTS_QUERY, {
        contractId: state.contractId,
        eventType: state.selectedType || null,
        limit: PAGE_SIZE + 1,
        offset,
        since: state.since ? new Date(state.since).toISOString() : null,
        until: state.until ? new Date(state.until).toISOString() : null,
      });

      const rows = payload.data.events || [];
      state.hasNext = rows.length > PAGE_SIZE;
      const visibleRows = state.hasNext ? rows.slice(0, PAGE_SIZE) : rows;

      renderEvents(visibleRows);
      updatePagination(visibleRows.length);
      setStatus("Events loaded.");
    } catch (error) {
      renderEvents([]);
      updatePagination(0);
      setStatus(error.message, true);
    }
  }

  function renderEvents(rows) {
    elements.tableBody.innerHTML = "";

    if (!rows.length) {
      const emptyRow = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.className = "empty-table";
      cell.textContent = "No events found for this filter selection.";
      emptyRow.appendChild(cell);
      elements.tableBody.appendChild(emptyRow);
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${formatDateTime(row.timestamp)}</td>
        <td><span class="pill">${escapeHtml(row.eventType)}</span></td>
        <td>${row.ledger}</td>
        <td>${row.eventIndex}</td>
        <td>${escapeHtml(shortHash(row.txHash))}</td>
        <td><code>${escapeHtml(trimPayload(row.payload))}</code></td>
      `;

      elements.tableBody.appendChild(tr);
    });
  }

  function updatePagination(renderedCount) {
    elements.previousPage.disabled = state.page <= 1;
    elements.nextPage.disabled = !state.hasNext;
    elements.pageIndicator.textContent = `Page ${state.page}`;
    elements.summary.textContent = `Showing ${renderedCount} event(s) on page ${state.page}.`;
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

  function shortHash(hash) {
    if (!hash || hash.length < 14) {
      return hash || "N/A";
    }
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  }

  function trimPayload(payload) {
    const raw = JSON.stringify(payload ?? {});
    if (raw.length <= 96) {
      return raw;
    }
    return `${raw.slice(0, 93)}...`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function setStatus(message, isError = false) {
    elements.status.textContent = message;
    elements.status.classList.toggle("error", Boolean(isError));
  }

  function validateDateRange(since, until) {
    if ((since && !until) || (!since && until)) {
      return "Provide both start and end dates, or leave both empty.";
    }
    if (since && until && new Date(since) > new Date(until)) {
      return "Date range is invalid: start date must be before end date.";
    }
    return "";
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
      const message = payload.errors.map((item) => item.message).join("; ");
      throw new Error(message);
    }

    return payload;
  }

  function getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  }

  init();
})();
