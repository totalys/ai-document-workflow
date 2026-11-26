/**
 * API client functions for the Document Workflow backend.
 * All functions use async/await and return parsed JSON or throw errors.
 */

const BASE_URL = "";

/**
 * Check if the API is healthy.
 * @returns {Promise<boolean>} true if API responds with status "ok"
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Send a workflow event to the API.
 * @param {object} event - The workflow event payload
 * @param {string} event.company_id
 * @param {string} event.document_id
 * @param {string} event.type
 * @param {string} event.timestamp
 * @param {number|null} [event.score]
 * @returns {Promise<object>} The updated DocumentWorkflow
 * @throws {Error} With the API error detail message on 422 or other errors
 */
export async function sendEvent(event) {
  const res = await fetch(`${BASE_URL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) {
        message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }

  return res.json();
}

/**
 * Fetch all workflows, optionally filtered by company.
 * @param {string} [companyId] - If provided, filter by this company
 * @returns {Promise<object[]>} Array of DocumentWorkflow objects
 */
export async function fetchWorkflows(companyId) {
  const path = companyId ? `/workflows/${encodeURIComponent(companyId)}` : "/workflows";
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch workflows: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch the event history for a specific document.
 * @param {string} companyId
 * @param {string} documentId
 * @returns {Promise<object[]>} Array of WorkflowEvent objects
 */
export async function fetchHistory(companyId, documentId) {
  const path = `/workflows/${encodeURIComponent(companyId)}/${encodeURIComponent(documentId)}/history`;
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch history: HTTP ${res.status}`);
  }
  return res.json();
}
