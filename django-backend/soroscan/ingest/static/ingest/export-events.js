const GRAPHQL_ENDPOINT = "/graphql/";
const EVENTS_PAGE_SIZE = 1000;
const EXPORT_CHUNK_SIZE = 5000;

const EVENTS_EXPORT_QUERY = `
  query EventsExport(
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
      contractId
      contractName
      eventType
      ledger
      eventIndex
      timestamp
      txHash
      payload
      payloadHash
      schemaVersion
      validationStatus
    }
  }
`;

const COLUMN_DEFS = [
  {
    key: "contractId",
    label: "Contract",
    value: (event) => event.contractId,
  },
  {
    key: "contractName",
    label: "Contract Name",
    value: (event) => event.contractName,
  },
  {
    key: "eventType",
    label: "Type",
    value: (event) => event.eventType,
  },
  {
    key: "ledger",
    label: "Ledger",
    value: (event) => event.ledger,
  },
  {
    key: "eventIndex",
    label: "Event Index",
    value: (event) => event.eventIndex,
  },
  {
    key: "timestamp",
    label: "Timestamp",
    value: (event) => event.timestamp,
  },
  {
    key: "txHash",
    label: "Tx Hash",
    value: (event) => event.txHash,
  },
  {
    key: "payloadHash",
    label: "Payload Hash",
    value: (event) => event.payloadHash,
  },
  {
    key: "validationStatus",
    label: "Validation",
    value: (event) => event.validationStatus,
  },
  {
    key: "schemaVersion",
    label: "Schema",
    value: (event) => event.schemaVersion,
  },
  {
    key: "payload",
    label: "Data",
    value: (event) => event.payload,
  },
];

const DEFAULT_COLUMNS = [
  "contractId",
  "eventType",
  "ledger",
  "eventIndex",
  "timestamp",
  "payload",
];

const PARQUET_FORMAT = "parquet";

let modalRefs = null;
let modalContext = null;
let isParquetReady = false;
let importCache = {
  papa: null,
  zip: null,
  arrow: null,
  parquet: null,
};

export function attachEventExport(options) {
  const trigger = resolveElement(options.trigger);
  if (!trigger) {
    throw new Error("Export trigger element was not found.");
  }

  ensureModal();

  trigger.addEventListener("click", () => {
    openEventExportModal(options);
  });

  return {
    open: () => openEventExportModal(options),
  };
}

function resolveElement(target) {
  if (!target) {
    return null;
  }
  if (target instanceof Element) {
    return target;
  }
  return document.querySelector(target);
}

function ensureModal() {
  if (modalRefs) {
    return modalRefs;
  }

  const overlay = document.createElement("div");
  overlay.className = "export-modal-overlay hidden";
  overlay.setAttribute("aria-hidden", "true");

  overlay.innerHTML = `
    <section class="export-modal" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
      <header class="export-modal-head">
        <h3 id="export-modal-title">Export Events</h3>
        <button type="button" class="modal-icon-btn" data-action="close" aria-label="Close export modal">x</button>
      </header>
      <div class="export-modal-body">
        <label class="field-label" for="export-format">Format</label>
        <select id="export-format" class="field-input">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="parquet">Parquet</option>
        </select>

        <p class="field-label">Columns</p>
        <div id="export-columns" class="column-grid" role="group" aria-label="Choose export columns"></div>

        <div class="export-date-grid">
          <div>
            <label class="field-label" for="export-since">Date Range From</label>
            <input id="export-since" class="field-input" type="datetime-local" />
          </div>
          <div>
            <label class="field-label" for="export-until">Date Range To</label>
            <input id="export-until" class="field-input" type="datetime-local" />
          </div>
        </div>

        <p id="export-selection-summary" class="summary"></p>
        <p id="export-error" class="status error hidden" role="alert"></p>

        <div class="progress-box">
          <div class="progress-track">
            <div id="export-progress-bar" class="progress-fill"></div>
          </div>
          <p id="export-progress-text" class="summary">Waiting to start export.</p>
        </div>
      </div>
      <footer class="export-modal-actions">
        <button type="button" class="btn secondary" data-action="close">Cancel</button>
        <button type="button" id="export-submit" class="btn">Export</button>
      </footer>
    </section>
  `;

  document.body.appendChild(overlay);

  const refs = {
    overlay,
    format: overlay.querySelector("#export-format"),
    columns: overlay.querySelector("#export-columns"),
    since: overlay.querySelector("#export-since"),
    until: overlay.querySelector("#export-until"),
    summary: overlay.querySelector("#export-selection-summary"),
    error: overlay.querySelector("#export-error"),
    progressBar: overlay.querySelector("#export-progress-bar"),
    progressText: overlay.querySelector("#export-progress-text"),
    submit: overlay.querySelector("#export-submit"),
  };

  overlay.querySelectorAll("[data-action='close']").forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalRefs && !modalRefs.overlay.classList.contains("hidden")) {
      closeModal();
    }
  });

  refs.submit.addEventListener("click", () => {
    void submitExport();
  });

  refs.format.addEventListener("change", () => {
    if (!modalContext) {
      return;
    }
    renderSelectionSummary(modalContext);
  });

  modalRefs = refs;
  return refs;
}

function openEventExportModal(context) {
  const refs = ensureModal();
  modalContext = context;

  refs.overlay.classList.remove("hidden");
  refs.overlay.setAttribute("aria-hidden", "false");

  refs.format.value = context.defaultFormat || "csv";
  refs.columns.innerHTML = "";

  const selected = new Set(context.defaultColumns || DEFAULT_COLUMNS);
  COLUMN_DEFS.forEach((column) => {
    const label = document.createElement("label");
    label.className = "column-option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = column.key;
    input.checked = selected.has(column.key);
    input.addEventListener("change", () => {
      renderSelectionSummary(context);
    });

    const text = document.createElement("span");
    text.textContent = column.label;

    label.appendChild(input);
    label.appendChild(text);
    refs.columns.appendChild(label);
  });

  const filters = context.getCurrentFilters ? context.getCurrentFilters() : {};
  refs.since.value = toDateTimeInputValue(filters.since);
  refs.until.value = toDateTimeInputValue(filters.until);

  resetProgress();
  setModalError("");
  renderSelectionSummary(context);
}

function closeModal() {
  if (!modalRefs) {
    return;
  }
  modalRefs.overlay.classList.add("hidden");
  modalRefs.overlay.setAttribute("aria-hidden", "true");
  modalRefs.submit.disabled = false;
  modalContext = null;
}

function setModalError(message) {
  if (!modalRefs) {
    return;
  }
  modalRefs.error.textContent = message;
  modalRefs.error.classList.toggle("hidden", !message);
}

function renderSelectionSummary(context) {
  const selectedColumns = getSelectedColumns();
  const filters = context.getCurrentFilters ? context.getCurrentFilters() : {};
  const eventTypeLabel = filters.eventTypes && filters.eventTypes.length
    ? `${filters.eventTypes.length} selected event type(s)`
    : "all event types";
  modalRefs.summary.textContent = `Exporting ${eventTypeLabel} with ${selectedColumns.length} column(s).`;
}

function getSelectedColumns() {
  return Array.from(modalRefs.columns.querySelectorAll("input:checked")).map((input) => input.value);
}

async function submitExport() {
  if (!modalContext || !modalRefs) {
    return;
  }

  const selectedColumns = getSelectedColumns();
  if (!selectedColumns.length) {
    setModalError("Select at least one column.");
    return;
  }

  const validationError = validateDateRange(modalRefs.since.value, modalRefs.until.value);
  if (validationError) {
    setModalError(validationError);
    return;
  }

  setModalError("");
  modalRefs.submit.disabled = true;

  const format = modalRefs.format.value;
  const filters = modalContext.getCurrentFilters ? modalContext.getCurrentFilters() : {};
  const since = modalRefs.since.value ? new Date(modalRefs.since.value).toISOString() : null;
  const until = modalRefs.until.value ? new Date(modalRefs.until.value).toISOString() : null;

  try {
    updateProgress("Fetching events...", 5);

    const rows = await fetchRowsForExport({
      contractId: modalContext.contractId,
      eventTypes: filters.eventTypes || [],
      since,
      until,
      onProgress: (message, percent) => updateProgress(message, percent),
    });

    if (!rows.length) {
      throw new Error("No events matched the selected filters.");
    }

    updateProgress(`Preparing ${format.toUpperCase()} file...`, 70);

    const timestamp = buildTimestamp();
    const baseName = buildBaseFileName(modalContext.contractId, timestamp);
    const payload = await buildExportPayload({
      rows,
      format,
      selectedColumns,
      baseName,
      onProgress: (message, percent) => updateProgress(message, percent),
    });

    downloadBlob(payload.filename, payload.mimeType, payload.content);
    updateProgress(`Downloaded ${payload.filename}`, 100);
    if (modalContext.onStatus) {
      modalContext.onStatus(`Exported ${rows.length} events to ${payload.filename}`);
    }

    window.setTimeout(() => {
      closeModal();
    }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    setModalError(message);
    updateProgress("Export failed.", 0);
    if (modalContext.onStatus) {
      modalContext.onStatus(message, true);
    }
  } finally {
    if (modalRefs) {
      modalRefs.submit.disabled = false;
    }
  }
}

function validateDateRange(sinceValue, untilValue) {
  if ((sinceValue && !untilValue) || (!sinceValue && untilValue)) {
    return "Provide both start and end dates, or leave both empty.";
  }

  if (sinceValue && untilValue && new Date(sinceValue) > new Date(untilValue)) {
    return "Date range is invalid: start date must be before end date.";
  }

  return "";
}

async function fetchRowsForExport({ contractId, eventTypes, since, until, onProgress }) {
  const normalizedTypes = eventTypes && eventTypes.length ? eventTypes : [null];
  const collectedRows = [];

  for (let typeIndex = 0; typeIndex < normalizedTypes.length; typeIndex += 1) {
    const eventType = normalizedTypes[typeIndex];
    let offset = 0;

    while (true) {
      const payload = await graphqlRequest(EVENTS_EXPORT_QUERY, {
        contractId,
        eventType,
        limit: EVENTS_PAGE_SIZE,
        offset,
        since,
        until,
      });

      const pageRows = payload.data.events || [];
      if (!pageRows.length) {
        break;
      }

      collectedRows.push(...pageRows);
      offset += pageRows.length;

      const typeLabel = eventType || "all events";
      onProgress(
        `Fetched ${collectedRows.length} events (${typeLabel}).`,
        Math.min(60, 10 + Math.floor(collectedRows.length / 200))
      );

      if (pageRows.length < EVENTS_PAGE_SIZE) {
        break;
      }
    }
  }

  return collectedRows;
}

async function buildExportPayload({ rows, format, selectedColumns, baseName, onProgress }) {
  if (rows.length <= EXPORT_CHUNK_SIZE) {
    const filename = `${baseName}.${format}`;
    const single = await serializeChunk({ rows, selectedColumns, format });
    return {
      filename,
      mimeType: single.mimeType,
      content: single.content,
    };
  }

  const zipModule = await getZipModule();
  const ZipClass = zipModule.default || zipModule;
  if (typeof ZipClass !== "function") {
    throw new Error("ZIP export library did not load correctly.");
  }
  const zip = new ZipClass();
  const chunks = splitRows(rows, EXPORT_CHUNK_SIZE);

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const partNumber = String(index + 1).padStart(3, "0");
    const partName = `${baseName}_part${partNumber}.${format}`;

    const serialized = await serializeChunk({ rows: chunk, selectedColumns, format });
    zip.file(partName, serialized.content);

    const completion = 70 + Math.floor(((index + 1) / chunks.length) * 25);
    onProgress(`Prepared chunk ${index + 1}/${chunks.length}.`, completion);
  }

  const archive = await zip.generateAsync({ type: "blob" });
  return {
    filename: `${baseName}.zip`,
    mimeType: "application/zip",
    content: archive,
  };
}

async function serializeChunk({ rows, selectedColumns, format }) {
  if (format === "csv") {
    return buildCsvChunk(rows, selectedColumns);
  }

  if (format === "json") {
    return buildJsonChunk(rows, selectedColumns);
  }

  if (format === PARQUET_FORMAT) {
    return buildParquetChunk(rows, selectedColumns);
  }

  throw new Error(`Unsupported export format: ${format}`);
}

async function buildCsvChunk(rows, selectedColumns) {
  const papaModule = await getPapaModule();
  const papa = papaModule.unparse ? papaModule : papaModule.default;
  if (!papa || typeof papa.unparse !== "function") {
    throw new Error("CSV export library did not load correctly.");
  }
  const projected = rows.map((row) => projectRow(row, selectedColumns, "csv"));
  const csv = papa.unparse(projected, {
    columns: selectedColumns,
  });

  return {
    content: csv,
    mimeType: "text/csv;charset=utf-8",
  };
}

function buildJsonChunk(rows, selectedColumns) {
  const projected = rows.map((row) => projectRow(row, selectedColumns, "json"));
  return {
    content: JSON.stringify(projected, null, 2),
    mimeType: "application/json",
  };
}

async function buildParquetChunk(rows, selectedColumns) {
  const [arrowModuleRaw, parquetModuleRaw] = await Promise.all([
    getArrowModule(),
    getParquetModule(),
  ]);
  const arrowModule = arrowModuleRaw.tableFromJSON
    ? arrowModuleRaw
    : arrowModuleRaw.default;
  const parquetModule = parquetModuleRaw.writeParquet
    ? parquetModuleRaw
    : parquetModuleRaw.default || parquetModuleRaw;

  if (!arrowModule || typeof arrowModule.tableFromJSON !== "function") {
    throw new Error("Parquet export failed to load Arrow helpers.");
  }

  const parquetInit =
    typeof parquetModuleRaw.default === "function" ? parquetModuleRaw.default : null;
  if (!isParquetReady && parquetInit) {
    await parquetInit();
    isParquetReady = true;
  }

  const projected = rows.map((row) => projectRow(row, selectedColumns, "parquet"));
  const arrowTable = arrowModule.tableFromJSON(projected);

  let parquetBytes = null;

  if (
    typeof parquetModule.writeParquet === "function" &&
    typeof parquetModule.Table?.fromIPCStream === "function" &&
    typeof arrowModule.tableToIPC === "function"
  ) {
    const arrowStream = arrowModule.tableToIPC(arrowTable, "stream");
    const parquetTable = parquetModule.Table.fromIPCStream(arrowStream);
    parquetBytes = parquetModule.writeParquet(parquetTable);
  } else if (typeof parquetModule.writeParquet === "function") {
    parquetBytes = parquetModule.writeParquet(arrowTable);
  }

  if (!parquetBytes) {
    throw new Error("Parquet export is unavailable in this browser runtime.");
  }

  return {
    content: new Blob([parquetBytes], { type: "application/octet-stream" }),
    mimeType: "application/octet-stream",
  };
}

function projectRow(row, selectedColumns, format) {
  const projected = {};

  selectedColumns.forEach((columnKey) => {
    const def = COLUMN_DEFS.find((item) => item.key === columnKey);
    if (!def) {
      return;
    }

    let value = def.value(row);

    if (columnKey === "payload" && format !== "json") {
      value = JSON.stringify(value ?? {});
    }

    projected[columnKey] = value;
  });

  return projected;
}

function splitRows(rows, chunkSize) {
  const chunks = [];
  for (let start = 0; start < rows.length; start += chunkSize) {
    chunks.push(rows.slice(start, start + chunkSize));
  }
  return chunks;
}

function buildBaseFileName(contractId, timestamp) {
  const safeContractId = sanitizeFilePart(contractId);
  return `events_${safeContractId}_${timestamp}`;
}

function sanitizeFilePart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function buildTimestamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  const second = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hour}${minute}${second}`;
}

function toDateTimeInputValue(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function updateProgress(message, percent) {
  if (!modalRefs) {
    return;
  }
  modalRefs.progressText.textContent = message;
  const safePercent = Math.max(0, Math.min(100, percent));
  modalRefs.progressBar.style.width = `${safePercent}%`;
}

function resetProgress() {
  updateProgress("Waiting to start export.", 0);
}

function downloadBlob(filename, mimeType, content) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function graphqlRequest(query, variables) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
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

async function getPapaModule() {
  if (!importCache.papa) {
    importCache.papa = import("https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm");
  }
  return importCache.papa;
}

async function getZipModule() {
  if (!importCache.zip) {
    importCache.zip = import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  }
  return importCache.zip;
}

async function getArrowModule() {
  if (!importCache.arrow) {
    importCache.arrow = import("https://cdn.jsdelivr.net/npm/apache-arrow@15.0.2/+esm");
  }
  return importCache.arrow;
}

async function getParquetModule() {
  if (!importCache.parquet) {
    importCache.parquet = import("https://cdn.jsdelivr.net/npm/parquet-wasm@0.7.1/esm/parquet_wasm.js");
  }
  return importCache.parquet;
}
