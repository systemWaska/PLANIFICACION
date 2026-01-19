// UI helpers: toast, safe text, debounce, date formatting, navbar helpers
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

  // -------------------------
  // Navbar helper
  // -------------------------
  // Hides the link that points to the current page.
  // This avoids showing "Ver" while you're already in "Ver", etc.
  function hideCurrentNav() {
    const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$(".nav a").forEach((a) => {
      try {
        const href = (a.getAttribute("href") || "").split("?")[0];
        const file = (href.split("/").pop() || "").toLowerCase();
        if (!file) return;
        if (file === current) a.style.display = "none";
      } catch (_) {
        // ignore
      }
    });
  }

  return { $, $$, toast, escapeHtml, debounce, formatDateShort, formatDateTime, hideCurrentNav };
})();
