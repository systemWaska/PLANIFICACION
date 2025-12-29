const APPS_SCRIPT_LIST_URL = "https://script.google.com/macros/s/AKfycbw2TYdikRhGWefhv6ijzG_pz_vlULRWMihjlMrgtlVzvq6nhYot1101G3Ict_XToPWrLQ/exec";

const $ = (sel) => document.querySelector(sel);

const statusDot = $("#statusDot");
const statusText = $("#statusText");
const msg = $("#msg");

const plansTbody = $("#plansTbody");
const searchInput = $("#searchInput");
const filterArea = $("#filterArea");
const filterEstado = $("#filterEstado");
const refreshBtn = $("#refreshBtn");

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

function safeText(v) {
  return String(v ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function normalizeStr(v) {
  return String(v ?? "").toLowerCase().trim();
}

function buildOptions(select, items, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(v => {
    select.innerHTML += `<option value="${safeText(v)}">${safeText(v)}</option>`;
  });
}

function renderPlans(rows) {
  if (!rows.length) {
    plansTbody.innerHTML = `<tr><td colspan="9" class="muted">No hay registros aún.</td></tr>`;
    return;
  }

  plansTbody.innerHTML = rows.map(r => `
    <tr>
      <td>${safeText(r.Area)}</td>
      <td>${safeText(r.Apoyo)}</td>
      <td>${safeText(r.Prioridad)}</td>
      <td>${safeText(r["Lista de labores"])}</td>
      <td>${safeText(r.Proyectado)}</td>
      <td>${safeText(r.Ejecutado)}</td>
      <td>${safeText(r.Estado)}</td>
      <td>${safeText(r.Observacion)}</td>
      <td>${safeText(r["Fecha registro"])}</td>
    </tr>
  `).join("");
}

function applyFilters() {
  const q = normalizeStr(searchInput.value);
  const a = filterArea.value;
  const s = filterEstado.value;

  const filtered = ALL_ROWS.filter(r => {
    if (a && r.Area !== a) return false;
    if (s && r.Estado !== s) return false;

    if (!q) return true;

    const hay = [
      r.Area, r.Apoyo, r.Prioridad, r["Lista de labores"],
      r.Proyectado, r.Ejecutado, r.Estado, r.Observacion, r["Fecha registro"]
    ].map(normalizeStr).join(" | ");

    return hay.includes(q);
  });

  renderPlans(filtered);
}

async function loadList() {
  try {
    setTopStatus("idle", "Cargando...");
    setMessage("");
    plansTbody.innerHTML = `<tr><td colspan="9" class="muted">Cargando...</td></tr>`;

    const res = await fetch(`${APPS_SCRIPT_LIST_URL}?action=list`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "No se pudo cargar el listado.");

    ALL_ROWS = json.rows || [];

    const areas = [...new Set(ALL_ROWS.map(r => r.Area).filter(Boolean))].sort();
    const estados = [...new Set(ALL_ROWS.map(r => r.Estado).filter(Boolean))].sort();

    buildOptions(filterArea, areas, "Área: Todas");
    buildOptions(filterEstado, estados, "Estado: Todos");

    applyFilters();
    setTopStatus("ok", "Conectado");
  } catch (e) {
    setTopStatus("err", "Error");
    setMessage(e.message, "err");
    plansTbody.innerHTML = `<tr><td colspan="9" class="muted">Error cargando datos.</td></tr>`;
  }
}

searchInput.addEventListener("input", applyFilters);
filterArea.addEventListener("change", applyFilters);
filterEstado.addEventListener("change", applyFilters);
refreshBtn.addEventListener("click", loadList);

loadList();
