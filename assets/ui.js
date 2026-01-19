// UI helpers: toast, safe text, debounce, date formatting, navbar helpers, theme
const UI = (() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function debounce(fn, wait = 250) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // -------------------------
  // Toast
  // -------------------------
  function toast(message, type = "ok") {
    const host = $("#toastHost") || (() => {
      const h = document.createElement("div");
      h.id = "toastHost";
      h.className = "toast-host";
      document.body.appendChild(h);
      return h;
    })();

    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<div class="toast-dot"></div><div class="toast-msg">${escapeHtml(message)}</div>`;
    host.appendChild(el);

    requestAnimationFrame(() => el.classList.add("show"));
    const remove = () => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 250);
    };
    setTimeout(remove, 3500);
    el.addEventListener("click", remove);
  }

  // -------------------------
  // Date formatting
  // -------------------------
  // Turns a value (Date | string) into dd/mm/yyyy.
  function formatDateShort(value, locale = "es-PE") {
    if (!value) return "";
    const d = (value instanceof Date) ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d);
  }

  // Turns a value (Date | string) into dd/mm/yyyy HH:MM.
  function formatDateTime(value, locale = "es-PE") {
    if (!value) return "";
    const d = (value instanceof Date) ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  }

  function parseDateSafe(value) {
    if (!value) return null;
    const d = (value instanceof Date) ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  // -------------------------
  // Theme (dark / light)
  // -------------------------
  function getPreferredTheme_() {
    // 1) Usuario guardó preferencia
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;

    // 2) Preferencia del sistema
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
    return "dark";
  }

  function applyTheme_(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);

    // Actualiza icono si existe botón
    const btn = $("#themeToggle");
    if (btn) {
      // Si estás en dark, muestra sol para pasar a light. Si estás en light, muestra luna.
      btn.textContent = theme === "dark" ? "☀️" : "🌙";
      btn.setAttribute("aria-label", theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    }
  }

  function initTheme() {
    const theme = getPreferredTheme_();
    applyTheme_(theme);

    const btn = $("#themeToggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const current = document.documentElement.dataset.theme || "dark";
        applyTheme_(current === "dark" ? "light" : "dark");
      });
    }
  }

  // -------------------------
  // Navbar helper
  // -------------------------
  // Hides the link that points to the current page.
  function hideCurrentNav() {
    const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$(".nav a").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      const file = (href.split("/").pop() || "").toLowerCase();
      if (!file) return;
      if (file === current) a.style.display = "none";
    });
  }

  // -------------------------
  // UI semantics helpers
  // -------------------------
  function estadoClass(estado) {
    const s = String(estado || "").toLowerCase();
    if (s.includes("concl") || s.includes("final")) return "state-good";
    if (s.includes("pend")) return "state-warn";
    if (s.includes("paus") || s.includes("suspend")) return "state-info";
    if (s.includes("anul") || s.includes("cancel")) return "state-bad";
    return "state-neutral";
  }

  // -------------------------------------------------
  // Backwards-compatible aliases
  // Some pages call these helpers using English names.
  // -------------------------------------------------
  // stateClass(estado) -> css class for the estado badge
  function stateClass(estado) {
    return estadoClass(estado);
  }

  // Due status based on proyectado date.
  // - overdue: now > due
  // - dueSoon: due - now <= thresholdHours (default 48h)
  function dueStatus(proyectado, estado, thresholdHours = 48) {
    const done = ["concluido", "finalizado", "anulado"].some(k => String(estado||"").toLowerCase().includes(k));
    if (done) return { kind: "done", cls: "" };

    const d = parseDateSafe(proyectado);
    if (!d) return { kind: "none", cls: "" };

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();

    if (diffMs < 0) return { kind: "overdue", cls: "row-bad" };

    const thresholdMs = thresholdHours * 60 * 60 * 1000;
    if (diffMs <= thresholdMs) return { kind: "dueSoon", cls: "row-warn" };

    return { kind: "ok", cls: "" };
  }

  // dueClass(proyectado, estado) -> row css class ("row-warn" / "row-bad" / "")
  function dueClass(proyectado, estado, thresholdHours = 48) {
    return dueStatus(proyectado, estado, thresholdHours).cls;
  }

  // Init theme + hide current nav on every page automatically
  // (Esto evita repetir la llamada en cada página y corrige el menú)
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    hideCurrentNav();
  });

  return {
    $,
    $$,
    toast,
    escapeHtml,
    debounce,
    formatDateShort,
    formatDateTime,
    parseDateSafe,
    initTheme,
    hideCurrentNav,
    // Estado / due helpers
    estadoClass,
    stateClass,
    dueStatus,
    dueClass
  };
})();
