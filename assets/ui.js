/* ui.js — helpers globales v3 */
const UI = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function debounce(fn, ms = 250) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* ── Toast ── */
  function toast(message, type = "ok") {
    let host = $("#toastHost");
    if (!host) { host = document.createElement("div"); host.id = "toastHost"; host.className = "toast-host"; document.body.appendChild(host); }
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<div class="toast-dot"></div><div>${escapeHtml(message)}</div>`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    const rm = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 250); };
    setTimeout(rm, 3500);
    el.addEventListener("click", rm);
  }

  /* ── Modal ── */
  function showModal({ title="", subtitle="", bodyHtml="", okText="Aceptar", tone="ok" } = {}) {
    document.querySelector(".modal-overlay:not([id])")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const iconChar = tone === "ok" ? "✓" : tone === "warn" ? "!" : "×";
    const iconCls  = tone === "ok" ? "ok-icon" : tone === "warn" ? "warn-icon" : "";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-icon ${iconCls}">${iconChar}</div>
          <div><div class="modal-title">${escapeHtml(title)}</div>${subtitle?`<div class="modal-sub">${escapeHtml(subtitle)}</div>`:""}</div>
        </div>
        ${bodyHtml ? `<div class="modal-body">${bodyHtml}</div>` : ""}
        <div class="modal-footer"><button class="btn btn-primary" id="__modalOk">${escapeHtml(okText)}</button></div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    const close = () => { document.body.style.overflow = ""; overlay.remove(); };
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function esc(ev) { if (ev.key === "Escape") { document.removeEventListener("keydown", esc); close(); } });
    overlay.querySelector("#__modalOk").addEventListener("click", close);
    setTimeout(() => overlay.querySelector("#__modalOk")?.focus(), 0);
    return { close };
  }

  function showPlanningSavedModal({ id="", user="" } = {}) {
    return showModal({
      title: "¡Planificación registrada!",
      subtitle: "Se guardó correctamente en Google Sheets.",
      bodyHtml: `<div class="modal-kv"><span class="modal-kv-label">ID</span><b class="modal-kv-val font-mono">${escapeHtml(id)}</b></div>${user?`<div class="modal-kv"><span class="modal-kv-label">Usuario</span><span class="modal-kv-val">${escapeHtml(user)}</span></div>`:""}`,
      okText: "Aceptar", tone: "ok"
    });
  }

  /* ── Dates ── */
  function fmtDate(v) {
    if (!v) return "";
    // Soporta "dd/mm/yyyy HH:mm" del backend
    if (/^\d{2}\/\d{2}\/\d{4}/.test(String(v))) return String(v).substring(0, 10);
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("es-PE", { day:"2-digit", month:"2-digit", year:"numeric" });
  }

  function fmtDateTime(v) {
    if (!v) return "";
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(String(v))) return String(v);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(v))) return String(v);
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("es-PE", { day:"2-digit", month:"2-digit", year:"numeric" }) +
      " " + d.toLocaleTimeString("es-PE", { hour:"2-digit", minute:"2-digit", hour12:false });
  }

  function parseDateSafe(v) {
    if (!v) return null;
    // "dd/mm/yyyy" o "dd/mm/yyyy HH:mm"
    const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s(\d{2}):(\d{2}))?/);
    if (m) return new Date(+m[3], +m[2]-1, +m[1], m[4]?+m[4]:0, m[5]?+m[5]:0);
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  /* ── Estado classes ── */
  function estadoClass(e) {
    const s = String(e||"").toLowerCase();
    if (/finaliz|conclu/.test(s)) return "badge-fin";
    if (/pend/.test(s))           return "badge-pend";
    if (/paus|suspend/.test(s))   return "badge-paus";
    if (/anul|cancel/.test(s))    return "badge-bad";
    return "badge-gray";
  }
  const stateClass = estadoClass;

  function dueClass(proyectado, estado, h = 48) {
    const done = /finaliz|conclu|anul/i.test(String(estado||""));
    if (done) return "";
    const d = parseDateSafe(proyectado);
    if (!d) return "";
    const diff = d.getTime() - Date.now();
    if (diff < 0) return "row-venc";
    if (diff <= h * 3600000) return "row-warn";
    return "";
  }

  /* ── Theme ── */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
    const btn = $("#themeToggle");
    if (btn) btn.textContent = t === "dark" ? "☀️" : "🌙";
  }
  function initTheme() {
    const saved = localStorage.getItem("theme");
    const pref  = window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    applyTheme(saved || pref);
    if (window.__themeBound) return;
    window.__themeBound = true;
    document.addEventListener("click", e => {
      if (e.target.closest("#themeToggle")) {
        e.preventDefault();
        const cur = document.documentElement.dataset.theme || "dark";
        applyTheme(cur === "dark" ? "light" : "dark");
      }
    });
  }

  /* ── Nav active ── */
  function initNav() {
    const cur = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$(".nav-link").forEach(a => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      const file = href.split("/").pop().toLowerCase();
      if (file === cur) a.classList.add("active");
    });
  }

  /* ── Status dot ── */
  function setStatus(state, text) {
    const dot  = $("#statusDot"),  lbl = $("#statusText");
    const cols = { ok:"var(--green)", warn:"var(--amber)", err:"var(--red)", idle:"var(--text3)" };
    if (dot) dot.style.background = cols[state] || cols.idle;
    if (lbl) lbl.textContent = text || "";
  }

  document.addEventListener("DOMContentLoaded", () => { initTheme(); initNav(); });

  return { $, $$, escapeHtml, debounce, toast, showModal, showPlanningSavedModal,
           formatDateShort: fmtDate, formatDateTime: fmtDateTime, parseDateSafe,
           estadoClass, stateClass, dueClass, setStatus, initTheme, initNav };
})();
