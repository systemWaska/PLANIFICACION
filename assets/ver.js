/* Ver planificaciones */

const URL = window.APPS_SCRIPT_WEBAPP_URL;
const $ = (s) => document.querySelector(s);

const q = $("#q");
const fArea = $("#fArea");
const fEstado = $("#fEstado");
const refreshBtn = $("#refreshBtn");
const tbody = $("#tbody");
const msg = $("#msg");
const countBadge = $("#countBadge");

let CONFIG = null;
let ROWS = [];

function showMsg(text, type) {
  if (!text) {
    msg.style.display = "none";
    msg.textContent = "";
    msg.className = "msg";
    return;
  }
  msg.style.display = "block";
  msg.textContent = text;
  msg.className = `msg ${type || ""}`.trim();
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildFilterOptions() {
  // Área
  const a0 = `<option value="__ALL__">Área: Todas</option>`;
  fArea.innerHTML = a0 + (CONFIG.areas || []).map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");

  // Estado
  const e0 = `<option value="__ALL__">Estado: Todos</option>`;
  fEstado.innerHTML = e0 + (CONFIG.estados || []).map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
}

function matchRow(row, text, areaSel, estadoSel) {
  const t = (text || "").trim().toLowerCase();

  if (areaSel && areaSel !== "__ALL__" && row.area !== areaSel) return false;
  if (estadoSel && estadoSel !== "__ALL__" && row.estado !== estadoSel) return false;

  if (!t) return true;

  const hay = [
    row.area,
    row.solicitante,
    row.prioridad,
    row.labores,
    row.estado,
    row.tiempo_estimado,
    row.ejecutado,
    row.fecha_registro,
  ].join(" ").toLowerCase();

  return hay.includes(t);
}

function render() {
  const text = q.value;
  const a = fArea.value;
  const s = fEstado.value;

  const filtered = ROWS.filter(r => matchRow(r, text, a, s));
  countBadge.textContent = `${filtered.length} registros`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:rgba(255,255,255,.55)">No hay registros.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td>${escapeHtml(r.area)}</td>
      <td>${escapeHtml(r.solicitante)}</td>
      <td>${escapeHtml(r.prioridad)}</td>
      <td style="white-space:pre-wrap">${escapeHtml(r.labores)}</td>
      <td>${escapeHtml(r.estado)}</td>
      <td>${escapeHtml(r.tiempo_estimado)}</td>
      <td>${escapeHtml(r.ejecutado)}</td>
      <td>${escapeHtml(r.fecha_registro)}</td>
    </tr>
  `).join("");
}

async function loadConfig() {
  if (!URL) throw new Error("Configura la URL del Web App en assets/config.js");
  setStatus("idle", "Conectando…");
  const json = await fetchJson(`${URL}?action=config`);
  CONFIG = json.config;
  buildFilterOptions();
}

async function loadRows() {
  setStatus("idle", "Cargando…");
  showMsg("");

  const json = await fetchJson(`${URL}?action=list`);
  ROWS = json.rows || [];
  setStatus("ok", "Conectado");
  render();
}

refreshBtn.addEventListener("click", () => loadRows().catch(e => showMsg(e.message, "err")));
q.addEventListener("input", render);
fArea.addEventListener("change", render);
fEstado.addEventListener("change", render);

(async function init(){
  try{
    await loadConfig();
    await loadRows();
  } catch(e){
    setStatus("err", "Error");
    showMsg(e.message || "No se pudo cargar.", "err");
  }
})();
