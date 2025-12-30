/**
 * shared.js
 * Funciones comunes reutilizadas en todas las páginas:
 * - URL del WebApp
 * - Helpers de DOM
 * - Estado superior (Conectado / Error)
 * - Toasts (alertas)
 * - apiGet / apiPost
 */

const APPS_SCRIPT_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbw2TYdikRhGWefhv6ijzG_pz_vlULRWMihjlMrgtlVzvq6nhYot1101G3Ict_XToPWrLQ/exec";

/** Shortcut para document.querySelector */
const $ = (sel) => document.querySelector(sel);

/**
 * Cambia el estado superior (pill) con color y texto
 * @param {"ok"|"warn"|"err"|"idle"} state
 * @param {string} text
 */
function setTopStatus(state, text) {
  const dot = $("#statusDot");
  const label = $("#statusText");
  if (!dot || !label) return;

  label.textContent = text;

  const colors = {
    ok: "rgba(34,197,94,.9)",
    warn: "rgba(250,204,21,.9)",
    err: "rgba(239,68,68,.9)",
    idle: "rgba(148,163,184,.7)",
  };

  dot.style.background = colors[state] || colors.idle;
}

/**
 * Toast (alerta flotante)
 * @param {string} title - Texto principal
 * @param {string} desc - Texto secundario
 * @param {"ok"|"err"} type
 */
function toast(title, desc = "", type = "ok") {
  const wrap = $("#toastWrap");
  if (!wrap) return;

  const el = document.createElement("div");
  el.className = `toast ${type}`;

  // Se renderiza simple para evitar inyección
  const safeTitle = String(title ?? "");
  const safeDesc = String(desc ?? "");

  el.innerHTML = `
    <div class="t">${safeTitle}</div>
    ${safeDesc ? `<div class="d">${safeDesc}</div>` : ""}
  `;

  wrap.appendChild(el);

  // Auto-close
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    el.style.transition = "all .25s ease";
    setTimeout(() => el.remove(), 260);
  }, 3200);
}

/**
 * GET al WebApp (Apps Script)
 * @param {Record<string,string>} params
 * @returns {Promise<any>}
 */
async function apiGet(params) {
  const url = `${APPS_SCRIPT_WEBAPP_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error || "Error en servidor.");
  return json;
}

/**
 * POST al WebApp (Apps Script)
 * @param {any} payload
 * @returns {Promise<any>}
 */
async function apiPost(payload) {
  const res = await fetch(APPS_SCRIPT_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // Apps Script a veces responde como texto; parseamos manualmente
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Respuesta inválida del servidor.");
  }

  if (!json.ok) throw new Error(json.error || "Error guardando.");
  return json;
}
