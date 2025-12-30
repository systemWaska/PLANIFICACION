// Ver planificaciones (tabla + filtros)
const $ = (s) => document.querySelector(s);

const statusDot = $("#statusDot");
const statusText = $("#statusText");

const q = $("#q");
const fArea = $("#fArea");
const fEstado = $("#fEstado");
const refreshBtn = $("#refreshBtn");
const tbody = $("#tbody");
const countEl = $("#count");

let CONFIG = null;
let ROWS = [];

function setTopStatus(state, text) {
  statusText.textContent = text;
  const colors = { ok:"rgba(34,197,94,.9)", warn:"rgba(250,204,21,.9)", err:"rgba(239,68,68,.9)", idle:"rgba(148,163,184,.7)" };
  statusDot.style.background = colors[state] || colors.idle;
}

function buildOptions(select, items, placeholder){
  select.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  opt0.selected = true;
  select.appendChild(opt0);

  (items || []).forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });

  if (window.EnhancedSelect) window.EnhancedSelect.enhanceSelect(select);
}

function escapeHtml(str){
  return (str || "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function rowToText(r){
  return [
    r.area, r.solicitante, r.prioridad, r.labores, r.estado, r.tiempo, r.ejecutado, r.registro
  ].join(" ").toLowerCase();
}

function render(rows){
  if (!rows.length){
    tbody.innerHTML = `<tr><td colspan="8">No hay registros.</td></tr>`;
    countEl.textContent = "";
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.area)}</td>
      <td>${escapeHtml(r.solicitante)}</td>
      <td><span class="badge">${escapeHtml(r.prioridad)}</span></td>
      <td>${escapeHtml(r.labores)}</td>
      <td>${escapeHtml(r.estado)}</td>
      <td>${escapeHtml(r.tiempo)}</td>
      <td>${escapeHtml(r.ejecutado || "")}</td>
      <td>${escapeHtml(r.registro || "")}</td>
    </tr>
  `).join("");

  countEl.textContent = `${rows.length} registro(s)`;
}

function applyFilters(){
  const qq = (q.value || "").trim().toLowerCase();
  const a = (fArea.value || "").trim();
  const st = (fEstado.value || "").trim();

  let rows = ROWS.slice();
  if (a) rows = rows.filter(r => r.area === a);
  if (st) rows = rows.filter(r => r.estado === st);
  if (qq) rows = rows.filter(r => rowToText(r).includes(qq));

  render(rows);
}

async function loadConfig(){
  const json = await apiGet("config");
  CONFIG = json.config;

  buildOptions(fArea, ["Todas", ...CONFIG.areas], "Área: Todas");
  buildOptions(fEstado, ["Todos", ...CONFIG.estados], "Estado: Todos");

  fArea.addEventListener("change", () => {
    if (fArea.value === "Todas") fArea.value = "";
    applyFilters();
  });
  fEstado.addEventListener("change", () => {
    if (fEstado.value === "Todos") fEstado.value = "";
    applyFilters();
  });
}

async function loadRows(){
  setTopStatus("idle","Cargando…");
  const json = await apiGet("list");
  ROWS = json.rows || [];
  setTopStatus("ok","Conectado");
  applyFilters();
}

q.addEventListener("input", applyFilters);
refreshBtn.addEventListener("click", () => loadRows().catch(e => UI.toast(e.message, "err")));

Promise.all([loadConfig(), loadRows()]).catch((e)=>{
  setTopStatus("err","Error");
  UI.toast(e.message || "Error cargando.", "err");
  tbody.innerHTML = `<tr><td colspan="8">${escapeHtml(e.message || "Error")}</td></tr>`;
});
