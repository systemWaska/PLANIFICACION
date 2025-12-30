const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxRYj6GaB8O7q-reEmLTPuZsoDDNQo9Gp_MDlJaFTJ-MiCF5vZ5DRk7gptwDYjA85G4UQ/exec";

const $ = (sel) => document.querySelector(sel);

const tbody = $("#tbody");
const msg = $("#msg");
const countLabel = $("#countLabel");

const searchText = $("#searchText");
const filterArea = $("#filterArea");
const filterEstado = $("#filterEstado");
const refreshBtn = $("#refreshBtn");

const statusDot = $("#statusDot");
const statusText = $("#statusText");

let ALL_ROWS = [];

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

function badgeForEstado(estado) {
  const s = String(estado || "").toLowerCase();
  if (s === "pendiente") return "badge badge-pendiente";
  if (s === "concluido") return "badge badge-concluido";
  if (s === "pausado") return "badge badge-pausado";
  if (s === "anulado") return "badge badge-anulado";
  return "badge";
}

function setAreaOptionsFromRows(rows) {
  const areas = Array.from(new Set(rows.map(r => r.area).filter(Boolean))).sort();
  filterArea.innerHTML = `<option value="Todas">Área: Todas</option>` + areas.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render(rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">No hay registros.</td></tr>`;
    countLabel.textContent = "0 resultados";
    return;
  }

  countLabel.textContent = `${rows.length} resultado(s)`;

  tbody.innerHTML = rows.map((r) => {
    const estado = r.estado || "Pendiente";

    return `
      <tr>
        <td data-label="Área">${escapeHtml(r.area)}</td>
        <td data-label="Solicitante">${escapeHtml(r.solicitante)}</td>
        <td data-label="Prioridad">${escapeHtml(r.prioridad)}</td>
        <td data-label="Lista de labores"><div class="labores-cell">${escapeHtml(r.labores)}</div></td>
        <td data-label="Estado"><span class="${badgeForEstado(estado)}">${escapeHtml(estado)}</span></td>
        <td data-label="Tiempo (h)">${escapeHtml(r.tiempoEstimadoHoras)}</td>
        <td data-label="Ejecutado">${escapeHtml(r.ejecutado || "")}</td>
        <td data-label="Fecha registro">${escapeHtml(r.fechaRegistro || "")}</td>
      </tr>
    `;
  }).join("");
}

function applyFilters() {
  const q = (searchText.value || "").trim().toLowerCase();
  const area = filterArea.value || "Todas";
  const estado = filterEstado.value || "Todos";

  const filtered = ALL_ROWS.filter((r) => {
    if (area !== "Todas" && r.area !== area) return false;
    if (estado !== "Todos" && (r.estado || "Pendiente") !== estado) return false;

    if (!q) return true;

    const haystack = [
      r.area, r.solicitante, r.prioridad, r.labores, r.estado,
      String(r.tiempoEstimadoHoras || ""), r.ejecutado, r.fechaRegistro
    ].join(" ").toLowerCase();

    return haystack.includes(q);
  });

  render(filtered);
}

async function loadRows() {
  setTopStatus("idle", "Conectando…");
  setMessage("");

  const url = `${APPS_SCRIPT_WEBAPP_URL}?action=rows`;
  const res = await fetch(url);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error || "No se pudo cargar la data.");

  ALL_ROWS = json.rows || [];
  setAreaOptionsFromRows(ALL_ROWS);

  if (!filterEstado.value || filterEstado.value === "Todos") {
    filterEstado.value = "Pendiente";
  }

  setTopStatus("ok", "Conectado");
  applyFilters();
}

refreshBtn.addEventListener("click", () => loadRows().catch((e) => {
  setTopStatus("err", "Error");
  setMessage(e.message, "err");
}));

searchText.addEventListener("input", applyFilters);
filterArea.addEventListener("change", applyFilters);
filterEstado.addEventListener("change", applyFilters);

loadRows().catch((e) => {
  setTopStatus("err", "Error");
  setMessage(e.message, "err");
});
