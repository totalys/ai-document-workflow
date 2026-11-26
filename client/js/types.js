/**
 * Constants for the Document Workflow frontend.
 * Event types, status values, badge configurations, and SVG icons.
 */

/** All valid workflow event types. */
export const EVENT_TYPES = [
  "DOCUMENT_UPLOADED",
  "DOCUMENT_PARSED",
  "SCORING_STARTED",
  "SCORING_COMPLETED",
  "REVIEW_REQUIRED",
  "APPROVED",
  "FAILED",
];

/** All valid workflow statuses. */
export const STATUSES = [
  "UPLOADED",
  "PARSED",
  "SCORING_IN_PROGRESS",
  "SCORED",
  "REVIEW_REQUIRED",
  "APPROVED",
  "FAILED",
];

/**
 * Maps each workflow status to its Bootstrap badge CSS classes.
 * @type {Record<string, string>}
 */
export const STATUS_COLORS = {
  UPLOADED: "badge bg-info",
  PARSED: "badge bg-primary",
  SCORING_IN_PROGRESS: "badge bg-warning text-dark",
  SCORED: "badge bg-success",
  REVIEW_REQUIRED: "badge bg-warning text-dark",
  APPROVED: "badge bg-success",
  FAILED: "badge bg-danger",
};

/**
 * State machine transitions for display in the diagram.
 * Each entry: { event, from, to, note }
 */
export const STATE_MACHINE = [
  { event: "DOCUMENT_UPLOADED", from: null, to: "UPLOADED", note: "new document" },
  { event: "DOCUMENT_PARSED", from: "UPLOADED", to: "PARSED", note: "requires UPLOADED" },
  { event: "SCORING_STARTED", from: "PARSED", to: "SCORING_IN_PROGRESS", note: "requires PARSED" },
  { event: "SCORING_COMPLETED", from: "SCORING_IN_PROGRESS", to: "SCORED", note: "requires SCORING_IN_PROGRESS" },
  { event: "REVIEW_REQUIRED", from: "SCORED", to: "REVIEW_REQUIRED", note: "requires SCORED" },
  { event: "APPROVED", from: "SCORED / REVIEW_REQUIRED", to: "APPROVED", note: "requires SCORED or REVIEW_REQUIRED" },
  { event: "FAILED", from: "any state", to: "FAILED", note: "allowed from any state" },
];

/**
 * SVG icon markup strings (Bootstrap Icons).
 * Safe to use with innerHTML since these are static constants, not API data.
 */
export const ICONS = {
  checkCircle: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>',
  xCircle: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>',
  clock: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>',
  eye: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>',
  cloudUpload: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/></svg>',
  fileCheck: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.854 7.854a.5.5 0 0 0-.708-.708L7.5 9.793 6.354 8.646a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"/><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 8 1.5V4h2.5L9.5 3z"/></svg>',
  star: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>',
  chevronDown: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>',
  chevronUp: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>',
  folder: '<svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor"><path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3H14a2 2 0 0 1 2 2v1.5H.5v-.163a2.002 2.002 0 0 1 .04-.373zM14.22 4H9.828a1 1 0 0 1-.707-.293l-.828-.828A3 3 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139C1.72 3.042 1.95 3 2.19 3h11.62c.24 0 .47.042.69.12L14.5 3a1 1 0 0 0-.28.88zM2.19 4a1.19 1.19 0 0 0-1.187 1.098l-.383 4.212A3 3 0 0 0 3.605 12.89l.497.054a26.056 26.056 0 0 0 7.796 0l.497-.054a3 3 0 0 0 2.985-3.58l-.383-4.212A1.19 1.19 0 0 0 13.81 4H2.19z"/></svg>',
  check: '<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>',
  circle: '<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  spinner: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" class="spin"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/></svg>',
};

/**
 * Configuration for status badges — maps status to CSS class and icon.
 * @type {Record<string, {badgeClass: string, icon: string, label: string}>}
 */
export const STATUS_CONFIG = {
  UPLOADED:            { badgeClass: "badge-uploaded", icon: ICONS.cloudUpload, label: "Uploaded" },
  PARSED:              { badgeClass: "badge-parsed",   icon: ICONS.fileCheck,   label: "Parsed" },
  SCORING_IN_PROGRESS: { badgeClass: "badge-scoring",  icon: ICONS.clock,       label: "Scoring" },
  SCORED:              { badgeClass: "badge-scored",    icon: ICONS.star,        label: "Scored" },
  REVIEW_REQUIRED:     { badgeClass: "badge-review",   icon: ICONS.eye,         label: "Review Required" },
  APPROVED:            { badgeClass: "badge-approved",  icon: ICONS.checkCircle, label: "Approved" },
  FAILED:              { badgeClass: "badge-failed",    icon: ICONS.xCircle,     label: "Failed" },
};

/**
 * Timeline dot colors for each status/event.
 * @type {Record<string, string>}
 */
export const TIMELINE_COLORS = {
  DOCUMENT_UPLOADED: "#0ea5e9",
  DOCUMENT_PARSED:   "#8b5cf6",
  SCORING_STARTED:   "#f59e0b",
  SCORING_COMPLETED: "#10b981",
  REVIEW_REQUIRED:   "#f59e0b",
  APPROVED:          "#10b981",
  FAILED:            "#ef4444",
};
