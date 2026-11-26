/**
 * Happy Path demo: sends a sequence of events with a step-by-step
 * animated list showing pending, active, and completed steps.
 */

import { sendEvent } from "./api.js";
import { showToast, loadWorkflows } from "./ui.js";
import { ICONS } from "./types.js";

/** Delay between events in milliseconds. */
const STEP_DELAY = 600;

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the happy path demo sequence.
 * Sends 5 events for a unique document, updating a step-by-step list.
 */
export async function runHappyPathDemo() {
  const btn = document.getElementById("demo-btn");
  const stepsContainer = document.getElementById("demo-steps");

  if (!btn || !stepsContainer) return;

  const docId = `doc-${Date.now()}`;
  const companyId = "demo-corp";

  const steps = [
    { type: "DOCUMENT_UPLOADED", label: "DOCUMENT_UPLOADED" },
    { type: "DOCUMENT_PARSED", label: "DOCUMENT_PARSED" },
    { type: "SCORING_STARTED", label: "SCORING_STARTED" },
    { type: "SCORING_COMPLETED", label: "SCORING_COMPLETED", score: 0.87 },
    { type: "APPROVED", label: "APPROVED" },
  ];

  // Disable button, show running state
  btn.disabled = true;
  const originalContent = btn.textContent;
  btn.textContent = "";
  const spinnerSpan = document.createElement("span");
  spinnerSpan.className = "spinner-border spinner-border-sm me-1";
  spinnerSpan.setAttribute("role", "status");
  btn.appendChild(spinnerSpan);
  btn.appendChild(document.createTextNode("Running..."));

  // Build step elements
  while (stepsContainer.firstChild) stepsContainer.removeChild(stepsContainer.firstChild);

  const stepElements = [];
  for (const step of steps) {
    const div = document.createElement("div");
    div.className = "demo-step demo-step-pending";

    const iconDiv = document.createElement("div");
    iconDiv.className = "demo-step-icon";
    iconDiv.innerHTML = ICONS.circle;
    div.appendChild(iconDiv);

    const label = document.createElement("span");
    label.textContent = step.label;
    div.appendChild(label);

    stepsContainer.appendChild(div);
    stepElements.push({ el: div, iconEl: iconDiv });
  }

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepEl = stepElements[i];

      // Mark current step as active
      stepEl.el.className = "demo-step demo-step-active";
      stepEl.iconEl.innerHTML = ICONS.circle;

      const payload = {
        company_id: companyId,
        document_id: docId,
        type: step.type,
        timestamp: new Date().toISOString(),
      };
      if (step.score !== undefined) {
        payload.score = step.score;
      }

      await sendEvent(payload);

      // Mark step as done
      stepEl.el.className = "demo-step demo-step-done";
      stepEl.iconEl.innerHTML = ICONS.check;

      if (i < steps.length - 1) {
        await sleep(STEP_DELAY);
      }
    }

    showToast(
      `Happy path demo completed! Document: ${docId}`,
      "success",
    );
  } catch (err) {
    showToast(`Demo failed: ${err.message}`, "error");
  } finally {
    // Restore button
    while (btn.firstChild) btn.removeChild(btn.firstChild);

    const playIcon = document.createElement("span");
    playIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="me-1"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    btn.appendChild(playIcon);
    btn.appendChild(document.createTextNode(" Run Demo"));

    btn.disabled = false;
    await loadWorkflows();
  }
}

/**
 * Initialize the demo button event listener.
 */
export function initDemo() {
  const btn = document.getElementById("demo-btn");
  if (btn) {
    btn.addEventListener("click", runHappyPathDemo);
  }
}
