# document-workflow — client

Web dashboard for the Document Workflow API. A single-page application that lets you send workflow events, monitor document statuses in real time, and explore the state machine visually.

Served directly by the FastAPI backend as static files — no separate server or build step required.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [Design Decisions](#design-decisions)

---

## Overview

```
browser  -->  GET /  -->  FastAPI (StaticFiles)  -->  client/index.html
browser  -->  POST /events, GET /workflows  -->  FastAPI (API routes)
```

**Stack:**

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styles | CSS3 + Bootstrap 5 (CDN) |
| Scripts | Vanilla JavaScript (ES modules) |
| Typography | Inter (Google Fonts) |
| Served by | FastAPI `StaticFiles` |

No build step. No bundler. No framework.

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | KPI cards (total, approved, review, failed) + workflow table |
| **Send Event** | Form to submit any of the 7 event types; timestamp set automatically |
| **Workflows** | Full workflow list with company filter and expandable event history |
| **State Map** | Visual diagram of all states and transitions + reference table |
| **Happy Path Demo** | One-click demo that runs a full upload → approval sequence |
| **Health indicator** | Live API status dot in the sidebar (polls every 30 s) |
| **Mobile** | Responsive sidebar with hamburger menu, swipe-to-close, and scroll lock |

---

## Getting Started

The client is served automatically when the API is running. No separate setup needed.

```bash
# From the project root
uv sync
uv run uvicorn app.main:app --reload
```

Open **http://localhost:8000** in your browser.

### Environment

The client calls the API on the same origin (`/events`, `/workflows`, `/health`), so no CORS configuration is required.

---

## Project Structure

```
client/
  index.html        # SPA shell — sidebar, top bar, four sections, modal
  css/
    style.css       # Design system: tokens, layout, components, responsive
  js/
    types.js        # Constants: event types, status config, SVG icons
    api.js          # Typed fetch wrappers for all API endpoints
    ui.js           # DOM rendering: table, badges, timeline, toasts, forms
    demo.js         # Happy Path demo — step-by-step animated sequence
    main.js         # SPA navigation, hamburger menu, initialization
```

---

## Pages

### Dashboard

Landing page. Shows four KPI counters updated on every load, a Happy Path Demo card, and the recent workflows table.

### Send Event

Form with three required fields — Company ID, Document ID, and Event Type. The timestamp is captured automatically at submit time. The Score field appears only when `SCORING_COMPLETED` is selected.

After a successful submission, the updated workflow is shown inline below the form.

### Workflows

Full paginated-free list of all workflows. Supports filtering by company ID. Click any row to expand its event timeline.

### State Map

Static visual diagram of the state machine followed by a transition reference table listing all seven events, their required current status, and the resulting status.

---

## Design Decisions

**Same-origin serving:** The client is mounted at `/` via FastAPI `StaticFiles(html=True)`. All API calls use relative paths (`/events`, `/workflows`), so there is no CORS requirement and no environment variable for the API base URL.

**No build step:** Vanilla ES modules loaded directly by the browser. The tradeoff is no TypeScript type safety at runtime, but the reduced tooling complexity fits the project scope.

**`api.js` is the boundary:** All `fetch` calls live exclusively in `api.js`. The rest of the JS never touches `fetch` directly, making it straightforward to swap the transport layer later (e.g., add auth headers, switch to WebSockets).

**No `innerHTML` with API data:** All DOM nodes that display API data are created with `createElement` / `textContent` to prevent XSS.

**Automatic timestamp:** The event timestamp is generated at submit time (`new Date().toISOString()`). Exposing it as a user input adds friction with no practical benefit for this UI.
