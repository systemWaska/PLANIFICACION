// UI helpers: toast, safe text, debounce
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

  return { $, $$, toast, escapeHtml, debounce };
})();
