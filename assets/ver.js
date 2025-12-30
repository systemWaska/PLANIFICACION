const { $, toast, escapeHtml, debounce } = UI;

const q = $("#q");
const fArea = $("#fArea");
const fEstado = $("#fEstado");
const refreshBtn = $("#refreshBtn");
const msg = $("#msg");
const rows = $("#rows");

let CONFIG = null;
let DATA = [];

function setTopStatus(state, text) {
  const dot = $("#statusDot");
  const label = $("#statusText");
  const colors = {
    ok: "rgba(34,197,94,.9)",
    warn: "rgba(250,204,21,.9)",
    err: "rgba(239,68,68,.9)",
    idle: "rgba(148,163,184,.7)"
  };
  dot.style.background = colors[state] || colors.idle;
  label.textContent = text;
}

function setMsg(t) { msg.textContent = t || ""; }

function buildSelect(select, items, placeholder) {
  select.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  opt0.selected = true;
  select.appendChild(opt0);

  (items || []).forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function normalize(s) {
  return String(s || "").toLowerCase();
}

function applyFilters() {
  const text = normalize(q.value);
  const area = fArea.value;
  const estado = fEstado.value;

  const filtered = DATA.filter((r) => {
    if (area && r.area !== area) return false;
    if (estado && r.estado !== estado) return false;
    if (!text) return true;

    const hay = [
      r.area, r.solicitante, r.prioridad, r.labores, r.estado, r.tiempo, r.ejecutado, r.fechaRegistro
    ].map(normalize).join(" | ");

    return hay.includes(text);
  });

  render(filtered);
}

function render(list) {
  if (!list.length) {
    rows.innerHTML = `<tr><td colspan="8">No hay registros.</td></tr>`;
    return;
  }

  rows.innerHTML = list.map((r) => `
    <tr>
      <td>${escapeHtml(r.area)}</td>
      <td>${escapeHtml(r.solicitante)}</td>
      <td><span class="badge">${escapeHtml(r.prioridad)}</span></td>
      <td>${escapeHtml(r.labores)}</td>
      <td><span class="badge">${escapeHtml(r.estado)}</span></td>
      <td>${escapeHtml(r.tiempo)}</td>
      <td>${escapeHtml(r.ejecutado)}</td>
      <td>${escapeHtml(r.fechaRegistro)}</td>
    </tr>
  `).join("");
}

async function load() {
  setTopStatus("idle", "Cargando...");
  setMsg("Cargando registros...");
  rows.innerHTML = `<tr><td colspan="8">Cargando...</td></tr>`;

  const cfgRes = await API.get("config");
  CONFIG = cfgRes.config;

  buildSelect(fArea, CONFIG.areas, "Área: Todas");
  buildSelect(fEstado, ["Pendiente", "Concluido", "Pausado", "Anulado"], "Estado: Todos");
  EnhancedSelect.enhanceAll(document);

  const res = await API.get("list");
  DATA = res.rows || [];
  setMsg("");
  setTopStatus("ok", "Conectado");
  applyFilters();
}

const applyFiltersDebounced = debounce(applyFilters, 200);

q.addEventListener("input", applyFiltersDebounced);
fArea.addEventListener("change", applyFilters);
fEstado.addEventListener("change", applyFilters);
refreshBtn.addEventListener("click", load);

load().catch((e) => {
  setTopStatus("err", "Error");
  toast(e.message || "Error", "err");
  setMsg(e.message || "Error");
  rows.innerHTML = `<tr><td colspan="8">Error cargando.</td></tr>`;
});
