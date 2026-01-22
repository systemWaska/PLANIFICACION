// UI helpers: toast, safe text, debounce, date formatting, navbar helpers, theme
// -----------------------------------------------------------------------------
// Este archivo se carga en TODAS las páginas (index/crear/ver/dashboard).
// Objetivo:
//   1) Tener una sola fuente de helpers (fechas, clases CSS, etc.).
//   2) Evitar repetir lógica en cada página.
//   3) Que el botón de tema (🌙/☀️) funcione de forma consistente.
// -----------------------------------------------------------------------------
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
  // Modal (popup) – reusable
  // -------------------------
  // Se usa para confirmaciones y para el "Planificación registrada" al crear.
  // Se crea dinámicamente para no duplicar HTML en cada página.
  function showModal({
    title = "",
    subtitle = "",
    bodyHtml = "",
    okText = "Aceptar",
    tone = "ok" // ok | warn | err
  } = {}) {
    // Cierra cualquier modal anterior
    const existing = document.querySelector(".modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const dialog = document.createElement("div");
    dialog.className = "modal";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const icon = tone === "ok" ? "✓" : tone === "warn" ? "!" : "×";
    dialog.innerHTML = `
      <div class="modal-icon modal-${escapeHtml(tone)}">${escapeHtml(icon)}</div>
      <div class="modal-title">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="modal-sub">${escapeHtml(subtitle)}</div>` : ""}
      ${bodyHtml ? `<div class="modal-body">${bodyHtml}</div>` : ""}
      <div class="modal-actions">
        <button class="btn btn-primary" id="modalOk">${escapeHtml(okText)}</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Bloquea scroll de fondo
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function close() {
      document.body.style.overflow = prevOverflow;
      overlay.remove();
    }

    // Cerrar con click fuera
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    // Cerrar con ESC
    document.addEventListener("keydown", function onKey(ev) {
      if (ev.key === "Escape") {
        document.removeEventListener("keydown", onKey);
        close();
      }
    });

    // Botón OK
    const okBtn = dialog.querySelector("#modalOk");
    if (okBtn) okBtn.addEventListener("click", close);

    // Foco al botón
    setTimeout(() => okBtn && okBtn.focus(), 0);

    return { close };
  }

  // Modal de éxito específico para el registro de planificación.
  function showPlanningSavedModal({ id = "", user = "" } = {}) {
    const body = `
      <div class="modal-kv"><span>Código generado:</span> <b>${escapeHtml(id)}</b></div>
      ${user ? `<div class="modal-kv"><span>Usuario:</span> <b>${escapeHtml(user)}</b></div>` : ""}
    `;
    return showModal({
      title: "¡Planificación registrada!",
      subtitle: "El registro se guardó correctamente.",
      bodyHtml: body,
      okText: "Aceptar",
      tone: "ok"
    });
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
    // Aplica el tema guardado o el preferido por el sistema
    const theme = getPreferredTheme_();
    applyTheme_(theme);

    // Listener robusto por delegacion:
    // - Funciona aunque el boton se renderice antes/despues del script.
    // - Evita dobles listeners entre paginas.
    if (window.__themeToggleBound) return;
    window.__themeToggleBound = true;

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#themeToggle");
      if (!btn) return;
      e.preventDefault();
      const current = document.documentElement.dataset.theme || "dark";
      applyTheme_(current === "dark" ? "light" : "dark");
    });
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

  // -------------------------
  // Connection status pill (top-right)
  // -------------------------
  // HTML expected:
  //   <span id="statusDot" class="dot ..."></span>
  //   <span id="statusText">...</span>
  function setTopStatus(text, kind = "info") {
    const dot = document.getElementById("statusDot");
    const label = document.getElementById("statusText");
    if (label) label.textContent = text;

    if (!dot) return;
    // Re-using existing CSS classes
    dot.classList.remove("dot-idle", "dot-good", "dot-warn", "dot-bad");
    if (kind === "ok") dot.classList.add("dot-good");
    else if (kind === "warn") dot.classList.add("dot-warn");
    else if (kind === "error") dot.classList.add("dot-bad");
    else dot.classList.add("dot-idle");
  }

  // Init theme + hide current nav on every page automatically
  // (Esto evita repetir la llamada en cada página y corrige el menú)
  // Ejecuta automáticamente en todas las páginas.
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();      // Activa tema (y botón)
    hideCurrentNav(); // Oculta el botón del menú de la página actual
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
    setTopStatus,
    // Estado / due helpers
    estadoClass,
    stateClass,
    dueStatus,
    dueClass,
    // Modals
    showModal,
    showPlanningSavedModal,
    // Top status
    setTopStatus
  };
})();
