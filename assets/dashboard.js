const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxRYj6GaB8O7q-reEmLTPuZsoDDNQo9Gp_MDlJaFTJ-MiCF5vZ5DRk7gptwDYjA85G4UQ/exec";

const $ = (sel) => document.querySelector(sel);

const kpiPendientes = $("#kpiPendientes");
const kpiConcluidos = $("#kpiConcluidos");
const kpiRetrasados = $("#kpiRetrasados");
const tbody = $("#tbody");
const msg = $("#msg");
const refreshBtn = $("#refreshBtn");

const statusDot = $("#statusDot");
const statusText = $("#statusText");

function setMessage(text, type = "") {
  msg.textContent = text || "";
  msg.className = `msg ${type}`.trim();
}

function setTopStatus(state, text) {
  statusText.textContent = text;
  const colors = {
    ok: "rgba(34,197,94,.9)",
    warn: "rgba(250,204,21,.9)",
    err: "rgba(239,68,68,.9)",
    idle: "rgba(148,163,184,.7)"
  };
  statusDot.style.background = colors[state] || colors.idle;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRetrasados(list) {
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">No hay retrasados.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((r) => `
    <tr>
      <td data-label="Área">${escapeHtml(r.area)}</td>
      <td data-label="Solicitante">${escapeHtml(r.solicitante)}</td>
      <td data-label="Prioridad">${escapeHtml(r.prioridad)}</td>
      <td data-label="Estado">${escapeHtml(r.estado)}</td>
      <td data-label="Tiempo (h)">${escapeHtml(r.tiempoEstimadoHoras)}</td>
      <td data-label="Horas transcurridas">${escapeHtml(r.horasTranscurridas)}</td>
      <td data-label="Fecha registro">${escapeHtml(r.fechaRegistro)}</td>
    </tr>
  `).join("");
}

async function loadStats() {
  setTopStatus("idle", "Conectando…");
  setMessage("");

  const url = `${APPS_SCRIPT_WEBAPP_URL}?action=stats`;
  const res = await fetch(url);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error || "No se pudo cargar stats.");

  const s = json.stats;

  kpiPendientes.textContent = s.pendientes;
  kpiConcluidos.textContent = s.concluidos;
  kpiRetrasados.textContent = s.retrasados;

  renderRetrasados(s.retrasadosList || []);
  setTopStatus("ok", "Conectado");
}

refreshBtn.addEventListener("click", () => loadStats().catch((e) => {
  setTopStatus("err", "Error");
  setMessage(e.message, "err");
}));

loadStats().catch((e) => {
  setTopStatus("err", "Error");
  setMessage(e.message, "err");
});
