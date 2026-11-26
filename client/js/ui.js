/**
 * DOM manipulation utilities for the Document Workflow frontend.
 * All rendering uses createElement / textContent to avoid XSS.
 */

import { STATUS_CONFIG, EVENT_TYPES, ICONS, TIMELINE_COLORS } from "./types.js";
import { checkHealth, sendEvent, fetchWorkflows } from "./api.js";

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Format an ISO timestamp for display.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Format an ISO timestamp as a relative time string.
 * @param {string} iso
 * @returns {string}
 */
function formatRelativeTime(iso) {
  if (!iso) return "";
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffSec = Math.floor((now - then) / 1000);

    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  } catch {
    return iso;
  }
}

/**
 * Set a datetime-local input to the current local time.
 * @param {HTMLInputElement} input
 */
function prefillTimestamp(input) {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  input.value = local.toISOString().slice(0, 16);
}

// ── Toast Notifications ──────────────────────────────────────────────

/**
 * Show a toast notification.
 * @param {string} message
 * @param {"success"|"error"} type
 */
export function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-custom ${type === "success" ? "toast-success" : "toast-error"}`;

  // Icon
  const iconDiv = document.createElement("div");
  iconDiv.className = `toast-icon ${type === "success" ? "toast-icon-success" : "toast-icon-error"}`;
  iconDiv.innerHTML = type === "success" ? ICONS.checkCircle : ICONS.xCircle;
  toast.appendChild(iconDiv);

  // Body
  const body = document.createElement("div");
  body.className = "toast-body";
  body.textContent = message;
  toast.appendChild(body);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", () => {
    toast.classList.add("toast-exit");
    setTimeout(() => toast.remove(), 300);
  });
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  // Auto-dismiss success toasts after 5s
  if (type === "success") {
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add("toast-exit");
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }
}

// Keep showAlert as an alias for backward compatibility with demo.js
export const showAlert = showToast;

// ── Health Check ─────────────────────────────────────────────────────

/**
 * Update the API health status in the sidebar.
 */
export async function updateHealthStatus() {
  const dot = document.getElementById("api-status-dot");
  const text = document.getElementById("api-status-text");
  if (!dot || !text) return;

  const online = await checkHealth();
  dot.className = online ? "status-dot online" : "status-dot offline";
  text.textContent = online ? "API Online" : "API Offline";
}

// Legacy alias
export const updateHealthBadge = updateHealthStatus;

// ── Status Badge ─────────────────────────────────────────────────────

/**
 * Create a styled status badge element.
 * @param {string} status
 * @returns {HTMLSpanElement}
 */
export function createStatusBadge(status) {
  const config = STATUS_CONFIG[status];
  const span = document.createElement("span");
  span.className = `status-badge ${config ? config.badgeClass : "badge-uploaded"}`;

  if (config) {
    const iconSpan = document.createElement("span");
    iconSpan.innerHTML = config.icon;
    span.appendChild(iconSpan);
  }

  const textNode = document.createTextNode(status);
  span.appendChild(textNode);

  return span;
}

// ── KPI Update ───────────────────────────────────────────────────────

/**
 * Update KPI card values from workflow data.
 * @param {object[]} workflows
 */
export function updateKPIs(workflows) {
  const totalEl = document.getElementById("kpi-total");
  const approvedEl = document.getElementById("kpi-approved");
  const reviewEl = document.getElementById("kpi-review");
  const failedEl = document.getElementById("kpi-failed");

  if (totalEl) totalEl.textContent = String(workflows.length);

  let approved = 0;
  let review = 0;
  let failed = 0;

  for (const wf of workflows) {
    if (wf.status === "APPROVED") approved++;
    else if (wf.status === "REVIEW_REQUIRED") review++;
    else if (wf.status === "FAILED") failed++;
  }

  if (approvedEl) approvedEl.textContent = String(approved);
  if (reviewEl) reviewEl.textContent = String(review);
  if (failedEl) failedEl.textContent = String(failed);
}

// ── Send Event Form ──────────────────────────────────────────────────

/**
 * Set up a send-event form (used for both section form and modal form).
 * @param {object} opts
 * @param {string} opts.formId
 * @param {string} opts.companyId
 * @param {string} opts.documentId
 * @param {string} opts.typeId
 * @param {string} opts.scoreId
 * @param {string} opts.scoreGroupId
 * @param {string} opts.submitBtnId
 * @param {string} opts.spinnerId
 * @param {string} opts.responseId
 * @param {string} [opts.modalId] — if set, close modal on success
 */
function setupEventForm(opts) {
  const form = document.getElementById(opts.formId);
  const typeSelect = document.getElementById(opts.typeId);
  const scoreGroup = document.getElementById(opts.scoreGroupId);
  const submitBtn = document.getElementById(opts.submitBtnId);
  const spinner = document.getElementById(opts.spinnerId);
  const responseArea = document.getElementById(opts.responseId);

  if (!form || !typeSelect || !scoreGroup || !submitBtn || !spinner) return;

  typeSelect.addEventListener("change", () => {
    scoreGroup.style.display = typeSelect.value === "SCORING_COMPLETED" ? "block" : "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const companyId = document.getElementById(opts.companyId).value.trim();
    const documentId = document.getElementById(opts.documentId).value.trim();
    const eventType = typeSelect.value;
    const scoreInput = document.getElementById(opts.scoreId);

    if (!companyId || !documentId || !eventType) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    const payload = {
      company_id: companyId,
      document_id: documentId,
      type: eventType,
      timestamp: new Date().toISOString(),
    };

    if (eventType === "SCORING_COMPLETED" && scoreInput && scoreInput.value) {
      payload.score = parseFloat(scoreInput.value);
    }

    submitBtn.disabled = true;
    spinner.classList.remove("d-none");

    try {
      const workflow = await sendEvent(payload);

      showToast(`Event sent successfully! Status: ${workflow.status}`, "success");

      // Show inline response
      if (responseArea) {
        showEventResponse(responseArea, workflow, true);
      }

      // Close modal if applicable
      if (opts.modalId) {
        const modalEl = document.getElementById(opts.modalId);
        if (modalEl) {
          const bsModal = bootstrap.Modal.getInstance(modalEl);
          if (bsModal) {
            setTimeout(() => bsModal.hide(), 800);
          }
        }
      }

      await loadWorkflows();
    } catch (err) {
      showToast(err.message, "error");
      if (responseArea) {
        showEventResponse(responseArea, err.message, false);
      }
    } finally {
      submitBtn.disabled = false;
      spinner.classList.add("d-none");
    }
  });
}

/**
 * Show event response (success or error) in a container.
 * @param {HTMLElement} container
 * @param {object|string} data - Workflow object on success, error message string on error
 * @param {boolean} isSuccess
 */
function showEventResponse(container, data, isSuccess) {
  while (container.firstChild) container.removeChild(container.firstChild);

  const card = document.createElement("div");
  card.className = `event-response-card ${isSuccess ? "event-response-success" : "event-response-error"}`;

  const title = document.createElement("div");
  title.className = "event-response-title";

  const iconSpan = document.createElement("span");
  iconSpan.innerHTML = isSuccess ? ICONS.checkCircle : ICONS.xCircle;
  title.appendChild(iconSpan);

  const titleText = document.createTextNode(isSuccess ? "Event sent successfully" : "Error sending event");
  title.appendChild(titleText);
  card.appendChild(title);

  if (isSuccess && typeof data === "object") {
    const detail = document.createElement("div");
    detail.className = "event-response-detail";

    const statusLine = document.createElement("div");
    statusLine.textContent = `Status: ${data.status}`;
    if (data.score != null) {
      statusLine.textContent += `  Score: ${data.score}`;
    }
    detail.appendChild(statusLine);

    const infoLine = document.createElement("div");
    infoLine.textContent = `Company: ${data.company_id}  Document: ${data.document_id}`;
    detail.appendChild(infoLine);

    const timeLine = document.createElement("div");
    timeLine.textContent = "Updated: just now";
    detail.appendChild(timeLine);

    card.appendChild(detail);
  } else if (!isSuccess) {
    const detail = document.createElement("div");
    detail.className = "event-response-detail";
    detail.textContent = typeof data === "string" ? data : "Unknown error";
    card.appendChild(detail);
  }

  container.appendChild(card);
}

/**
 * Initialize the main Send Event form.
 */
export function initEventForm() {
  setupEventForm({
    formId: "event-form",
    companyId: "event-company",
    documentId: "event-document",
    typeId: "event-type",
    scoreId: "event-score",
    scoreGroupId: "score-group",
    submitBtnId: "submit-event-btn",
    spinnerId: "submit-spinner",
    responseId: "event-response",
  });
}

/**
 * Initialize the modal Send Event form.
 */
export function initModalForm() {
  setupEventForm({
    formId: "modal-event-form",
    companyId: "modal-event-company",
    documentId: "modal-event-document",
    typeId: "modal-event-type",
    scoreId: "modal-event-score",
    scoreGroupId: "modal-score-group",
    submitBtnId: "modal-submit-btn",
    spinnerId: "modal-submit-spinner",
    responseId: "modal-event-response",
    modalId: "event-modal",
  });
}

// ── Workflows Table ──────────────────────────────────────────────────

/** Currently expanded row key (company_id::document_id) */
let expandedRow = null;

/**
 * Load and render the workflows table.
 * Updates BOTH dashboard and workflows-section tables plus KPIs.
 * @param {string} [companyFilter] - Optional company_id filter
 */
export async function loadWorkflows(companyFilter) {
  const tbodies = [
    document.getElementById("dashboard-workflows-tbody"),
    document.getElementById("workflows-tbody"),
  ];

  // Determine filter value
  let filter = companyFilter;
  if (filter === undefined) {
    const dashInput = document.getElementById("dashboard-filter-company");
    const wfInput = document.getElementById("filter-company");
    filter = dashInput?.value.trim() || wfInput?.value.trim() || "";
  }

  // Manage refresh spinners
  const refreshControls = [
    { btn: document.getElementById("dashboard-refresh-btn"), spinner: document.getElementById("dashboard-refresh-spinner") },
    { btn: document.getElementById("refresh-btn"), spinner: document.getElementById("refresh-spinner") },
  ];

  for (const ctrl of refreshControls) {
    if (ctrl.btn) ctrl.btn.disabled = true;
    if (ctrl.spinner) ctrl.spinner.classList.remove("d-none");
  }

  try {
    const workflows = await fetchWorkflows(filter || undefined);
    for (const tbody of tbodies) {
      if (tbody) renderWorkflowsTable(tbody, workflows);
    }
    updateKPIs(workflows);
  } catch (err) {
    showToast(`Failed to load workflows: ${err.message}`, "error");
  } finally {
    for (const ctrl of refreshControls) {
      if (ctrl.btn) ctrl.btn.disabled = false;
      if (ctrl.spinner) ctrl.spinner.classList.add("d-none");
    }
  }
}

/**
 * Render workflow rows into a table body.
 * @param {HTMLElement} tbody
 * @param {object[]} workflows
 */
function renderWorkflowsTable(tbody, workflows) {
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  if (workflows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "empty-state";

    const iconDiv = document.createElement("div");
    iconDiv.innerHTML = ICONS.folder;
    cell.appendChild(iconDiv);

    const text = document.createElement("p");
    text.className = "empty-state-text";
    text.textContent = "No workflows yet. Send your first event to get started.";
    cell.appendChild(text);

    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  for (const wf of workflows) {
    const row = document.createElement("tr");
    row.className = "row-clickable";
    const rowKey = `${wf.company_id}::${wf.document_id}`;

    // Company
    const tdCompany = document.createElement("td");
    tdCompany.textContent = wf.company_id;
    row.appendChild(tdCompany);

    // Document
    const tdDoc = document.createElement("td");
    tdDoc.textContent = wf.document_id;
    row.appendChild(tdDoc);

    // Status badge
    const tdStatus = document.createElement("td");
    tdStatus.appendChild(createStatusBadge(wf.status));
    row.appendChild(tdStatus);

    // Score with mini progress bar
    const tdScore = document.createElement("td");
    if (wf.score != null) {
      const scoreCell = document.createElement("div");
      scoreCell.className = "score-cell";

      const scoreText = document.createElement("span");
      scoreText.textContent = Number(wf.score).toFixed(2);
      scoreCell.appendChild(scoreText);

      const barWrapper = document.createElement("div");
      barWrapper.className = "score-bar-wrapper";
      const bar = document.createElement("div");
      bar.className = "score-bar";
      bar.style.width = `${Math.round(wf.score * 100)}%`;
      barWrapper.appendChild(bar);
      scoreCell.appendChild(barWrapper);

      tdScore.appendChild(scoreCell);
    } else {
      tdScore.textContent = "\u2014";
    }
    row.appendChild(tdScore);

    // Last Updated
    const tdUpdated = document.createElement("td");
    tdUpdated.textContent = formatDate(wf.updated_at);
    row.appendChild(tdUpdated);

    // Expand button
    const tdExpand = document.createElement("td");
    const expandBtn = document.createElement("button");
    expandBtn.className = "expand-btn";
    expandBtn.innerHTML = ICONS.chevronDown;
    tdExpand.appendChild(expandBtn);
    row.appendChild(tdExpand);

    // Click to expand/collapse
    row.addEventListener("click", () => {
      const existing = row.nextElementSibling;
      if (existing && existing.classList.contains("history-row")) {
        existing.remove();
        expandedRow = null;
        expandBtn.innerHTML = ICONS.chevronDown;
        return;
      }
      // Remove any other expanded row in this tbody
      const old = tbody.querySelector(".history-row");
      if (old) old.remove();
      // Reset all expand buttons
      for (const btn of tbody.querySelectorAll(".expand-btn")) {
        btn.innerHTML = ICONS.chevronDown;
      }

      expandedRow = rowKey;
      expandBtn.innerHTML = ICONS.chevronUp;
      const historyRow = createHistoryRow(wf);
      row.after(historyRow);
    });

    tbody.appendChild(row);

    // If this row was previously expanded, re-expand it
    if (expandedRow === rowKey) {
      expandBtn.innerHTML = ICONS.chevronUp;
      const historyRow = createHistoryRow(wf);
      row.after(historyRow);
    }
  }
}

/**
 * Create a timeline history row for a workflow.
 * @param {object} wf - DocumentWorkflow object
 * @returns {HTMLTableRowElement}
 */
function createHistoryRow(wf) {
  const historyRow = document.createElement("tr");
  historyRow.className = "history-row";

  const cell = document.createElement("td");
  cell.colSpan = 6;

  if (!wf.history || wf.history.length === 0) {
    const noData = document.createElement("div");
    noData.className = "timeline";
    noData.style.color = "var(--color-text-muted)";
    noData.textContent = "No events recorded.";
    cell.appendChild(noData);
  } else {
    const timeline = document.createElement("div");
    timeline.className = "timeline";

    for (const evt of wf.history) {
      const item = document.createElement("div");
      item.className = "timeline-item";

      const dot = document.createElement("div");
      dot.className = "timeline-dot";
      dot.style.backgroundColor = TIMELINE_COLORS[evt.type] || "#94a3b8";
      item.appendChild(dot);

      const content = document.createElement("div");
      content.className = "timeline-content";

      const typeSpan = document.createElement("span");
      typeSpan.className = "timeline-event-type";
      typeSpan.textContent = evt.type;
      content.appendChild(typeSpan);

      if (evt.score != null) {
        const scoreSpan = document.createElement("span");
        scoreSpan.className = "timeline-score";
        scoreSpan.textContent = `Score: ${evt.score}`;
        content.appendChild(scoreSpan);
      }

      const timeSpan = document.createElement("div");
      timeSpan.className = "timeline-time";
      timeSpan.textContent = formatRelativeTime(evt.timestamp);
      content.appendChild(timeSpan);

      item.appendChild(content);
      timeline.appendChild(item);
    }

    cell.appendChild(timeline);
  }

  historyRow.appendChild(cell);
  return historyRow;
}

/**
 * Initialize workflows table controls (refresh, filter) for both sections.
 */
export function initWorkflowsTable() {
  // Dashboard controls
  const dashRefresh = document.getElementById("dashboard-refresh-btn");
  const dashFilter = document.getElementById("dashboard-filter-company");

  if (dashRefresh) {
    dashRefresh.addEventListener("click", () => loadWorkflows());
  }
  if (dashFilter) {
    dashFilter.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadWorkflows(dashFilter.value.trim());
      }
    });
  }

  // Workflows section controls
  const refreshBtn = document.getElementById("refresh-btn");
  const filterInput = document.getElementById("filter-company");
  const filterBtn = document.getElementById("filter-btn");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => loadWorkflows());
  }
  if (filterBtn && filterInput) {
    filterBtn.addEventListener("click", () => {
      loadWorkflows(filterInput.value.trim());
    });
    filterInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadWorkflows(filterInput.value.trim());
      }
    });
  }
}

// ── Populate Event Type Selects ──────────────────────────────────────

/**
 * Populate all event type select elements with options.
 */
export function populateEventTypeSelect() {
  const selects = [
    document.getElementById("event-type"),
    document.getElementById("modal-event-type"),
  ];

  for (const select of selects) {
    if (!select) continue;
    for (const type of EVENT_TYPES) {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      select.appendChild(option);
    }
  }
}
