/**
 * Entry point for the Document Workflow frontend.
 * Initializes all UI components and handles SPA navigation.
 */

import {
  updateHealthStatus,
  initEventForm,
  initModalForm,
  initWorkflowsTable,
  loadWorkflows,
  populateEventTypeSelect,
} from "./ui.js";
import { initDemo } from "./demo.js";

/** Section titles for the top bar. */
const SECTION_TITLES = {
  "section-dashboard": "Dashboard",
  "section-send-event": "Send Event",
  "section-workflows": "Workflows",
  "section-statemap": "State Map",
};

/**
 * Show a section and update navigation state.
 * @param {string} sectionId
 */
function showSection(sectionId) {
  // Hide all sections
  const sections = document.querySelectorAll(".main-section");
  for (const s of sections) {
    s.style.display = "none";
  }

  // Show target section
  const target = document.getElementById(sectionId);
  if (target) {
    target.style.display = "block";
  }

  // Update sidebar active state
  const navItems = document.querySelectorAll(".nav-item[data-section]");
  for (const item of navItems) {
    if (item.getAttribute("data-section") === sectionId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  }

  // Update top bar title
  const titleEl = document.getElementById("top-bar-title");
  if (titleEl) {
    titleEl.textContent = SECTION_TITLES[sectionId] || "Dashboard";
  }

  // Close mobile sidebar if open
  closeMobileSidebar();
}

/**
 * Open the mobile sidebar.
 */
function openMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  if (sidebar) sidebar.classList.add("open");
  if (overlay) overlay.classList.add("show");
  if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "true");
  document.body.classList.add("sidebar-open");
}

/**
 * Close the mobile sidebar.
 */
function closeMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
  if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("sidebar-open");
}

/**
 * Initialize SPA navigation.
 */
function initNavigation() {
  // Sidebar nav items
  const navItems = document.querySelectorAll(".nav-item[data-section]");
  for (const item of navItems) {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const sectionId = item.getAttribute("data-section");
      if (sectionId) {
        showSection(sectionId);
      }
    });
  }

  // Hamburger button
  const hamburgerBtn = document.getElementById("hamburger-btn");
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      if (sidebar && sidebar.classList.contains("open")) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }

  // Overlay click closes sidebar
  const overlay = document.getElementById("sidebar-overlay");
  if (overlay) {
    overlay.addEventListener("click", closeMobileSidebar);
  }

  // "New Event" button — navigate to Send Event section and reset form
  const newEventBtn = document.getElementById("new-event-btn");
  if (newEventBtn) {
    newEventBtn.addEventListener("click", () => {
      showSection("section-send-event");
      const form = document.getElementById("event-form");
      if (form) form.reset();
      const scoreGroup = document.getElementById("score-group");
      if (scoreGroup) scoreGroup.style.display = "none";
      const responseArea = document.getElementById("event-response");
      if (responseArea) responseArea.innerHTML = "";
      document.getElementById("event-company")?.focus();
    });
  }

  // ESC key closes the sidebar
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileSidebar();
  });

  // Swipe-left to close the sidebar
  let touchStartX = 0;
  document.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (e.changedTouches[0].clientX - touchStartX < -50) closeMobileSidebar();
  }, { passive: true });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize navigation
  initNavigation();

  // Populate dynamic elements
  populateEventTypeSelect();

  // Initialize forms and table controls
  initEventForm();
  initModalForm();
  initWorkflowsTable();
  initDemo();

  // Load initial data
  await Promise.all([
    updateHealthStatus(),
    loadWorkflows(),
  ]);

  // Poll health status every 30 seconds
  setInterval(updateHealthStatus, 30000);
});
