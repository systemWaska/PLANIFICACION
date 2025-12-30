/**
 * VER (OPTIMO)
 * - GET action=list
 * - Filtro Área + Estado + Buscador (combinados)
 * - Render table
 */

const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxRYj6GaB8O7q-reEmLTPuZsoDDNQo9Gp_MDlJaFTJ-MiCF5vZ5DRk7gptwDYjA85G4UQ/exec";

const $ = (sel) => document.querySelector(sel);

const statusDot = $("#statusDot");
const statusText = $("#statusText");

const tbody = $("#tbody");
const search = $("#search");
const filterArea = $("#filterArea");
const filterEstado = $("#filterEstado");
const refreshBtn = $("#refreshBtn");

let ALL_ROWS = [];

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

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function setAreaOptionsFromRows(rows) {
  const areas = [...new Set(rows.map(r => r["Area"]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  // reset
  filterArea.innerHTML = `<option value="Todas">Área: Todas</option>`;
  areas.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = `Área: ${a}`;
    filterArea.appendChild(opt);
  });
}

function renderTable(rows) {
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="muted">No hay registros con esos filtros.</td></tr>`;
    return;
  }

  const html = rows.map(r => {
    const area = r["Area"] ?? "";
    const apoyo = r["Apoyo"] ?? "";
    const prioridad = r["Prioridad"] ?? "";
    const labores = r["Lista de labores"] ?? "";
    const proyectado = r["Proyectado"] ?? "";
    const ejecutado = r["Ejecutado"] ?? "";
    const estado = r["Estado"] ?? "";
    const tiempo = r["Observacion"] ?? "";
    const fechaReg = r["Fecha registro"] ?? "";

    return `
      <tr>
        <td>${escapeHtml(area)}</td>
        <td>${escapeHtml(apoyo)}</td>
        <td>${escapeHtml(prioridad)}</td>
        <td style="min-width:260px">${escapeHtml(labores)}</td>
        <td>${escapeHtml(proyectado)}</td>
        <td>${escapeHtml(ejecutado)}</td>
        <td>${escapeHtml(estado)}</td>
        <td>${escapeHtml(tiempo)}</td>
        <td>${escapeHtml(fechaReg)}</td>
      </tr>
    `;
  }).join("");

  tbody.innerHTML = html;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyFilters() {
  const areaVal = filterArea.value;
  const estadoVal = filterEstado.value;
  const q = norm(search.value);

  const filtered = ALL_ROWS.filter(r => {
    if (areaVal && areaVal !== "Todas" && String(r["Area"] || "") !== areaVal) return false;
    if (estadoVal && estadoVal !== "Todos" && String(r["Estado"] || "") !== estadoVal) return false;

    if (q) {
      const hay = [
        r["Area"], r["Apoyo"], r["Prioridad"], r["Lista de labores"],
        r["Proyectado"], r["Ejecutado"], r["Estado"], r["Observacion"], r["Fecha registro"]
      ].map(norm).join(" ");
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  renderTable(filtered);
}

async function loadRows() {
  if (!APPS_SCRIPT_WEBAPP_URL || APPS_SCRIPT_WEBAPP_URL.includes("PEGA_AQUI")) {
    setTopStatus("err", "Falta URL del WebApp");
    tbody.innerHTML = `<tr><td colspan="9" class="muted">Configura APPS_SCRIPT_WEBAPP_URL en assets/ver.js</td></tr>`;
    return;
  }

  setTopStatus("idle", "Cargando...");
  tbody.innerHTML = `<tr><td colspan="9" class="muted">Cargando...</td></tr>`;

  const url = `${APPS_SCRIPT_WEBAPP_URL}?action=list`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "No se pudo cargar la lista.");

  ALL_ROWS = json.rows || [];
  setAreaOptionsFromRows(ALL_ROWS);

  setTopStatus("ok", "Conectado");
  applyFilters();
}

const applyFiltersDebounced = debounce(applyFilters, 150);

search.addEventListener("input", applyFiltersDebounced);
filterArea.addEventListener("change", applyFilters);
filterEstado.addEventListener("change", applyFilters);
refreshBtn.addEventListener("click", () => loadRows().catch(err => {
  setTopStatus("err", "Error");
  tbody.innerHTML = `<tr><td colspan="9" class="muted">${escapeHtml(err.message)}</td></tr>`;
}));

loadRows().catch(err => {
  setTopStatus("err", "Error");
  tbody.innerHTML = `<tr><td colspan="9" class="muted">${escapeHtml(err.message)}</td></tr>`;
});
