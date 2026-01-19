// Página: VER (tabla de planificaciones)
// ------------------------------------------------------------
// Nota: No llamamos initTheme() ni hideCurrentNav() aquí,
// porque ui.js ya lo hace automáticamente en DOMContentLoaded.
// Esto evita listeners duplicados y errores sutiles.
const { $, toast, escapeHtml, debounce, formatDateShort, formatDateTime, stateClass, dueClass } = UI;

const q = $("#q");
const fArea = $("#fArea");
const fEstado = $("#fEstado");
const refreshBtn = $("#refreshBtn");
const msg = $("#msg");
const rows = $("#rows");
const cards = $("#cards");

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
      r.id, r.area, r.solicitante, r.prioridad, r.labores, r.estado,
      r.tiempo, r.proyectado, r.ejecutado, (r.fechaRegistro || r.fecha)
    ].map(normalize).join(" | ");

    return hay.includes(text);
  });

  render(filtered);
}

function render(list) {
  if (!list.length) {
    rows.innerHTML = `<tr><td colspan="8">No hay registros.</td></tr>`;
    if (cards) {
      cards.innerHTML = `<div class="card-item"><div class="card-row"><div class="k">Sin registros</div><div class="v">No hay registros.</div></div></div>`;
    }
    return;
  }

  rows.innerHTML = list.map((r) => {
    const ejecutado = formatDateShort(r.ejecutado);
    const registro = formatDateTime((r.fechaRegistro || r.fecha));
    const stClass = stateClass(r.estado);
    const dueCls = dueClass(r.proyectado, r.estado);

    return `
    <tr class="${dueCls}">
      <td>${escapeHtml(r.area)}</td>
      <td class="cell-strong">${escapeHtml(r.solicitante)}</td>
      <td><span class="badge">${escapeHtml(r.prioridad)}</span></td>
      <td class="cell-muted">${escapeHtml(r.labores)}</td>
      <td><span class="badge ${stClass}">${escapeHtml(r.estado)}</span></td>
      <td><span class="badge badge-time">${escapeHtml(r.tiempo)}</span></td>
      <td>${escapeHtml(ejecutado)}</td>
      <td>${escapeHtml(registro)}</td>
      <td>${escapeHtml(formatDateTime(r.proyectado))}</td>
    </tr>
  `;
  }).join("");

  // Mobile: cards
  if (cards) {
    cards.innerHTML = list.map((r) => {
      const ejecutado = formatDateShort(r.ejecutado);
      const registro = formatDateTime((r.fechaRegistro || r.fecha));
      const stClass = stateClass(r.estado);
      const dueCls = dueClass(r.proyectado, r.estado);

      return `
      <div class="card-item ${dueCls}">
        <div class="card-row"><div class="k">Área</div><div class="v">${escapeHtml(r.area)}</div></div>
        <div class="card-row"><div class="k">Solicitante</div><div class="v">${escapeHtml(r.solicitante)}</div></div>
        <div class="card-row"><div class="k">Prioridad</div><div class="v"><span class="badge">${escapeHtml(r.prioridad)}</span></div></div>
        <div class="card-row"><div class="k">Estado</div><div class="v"><span class="badge ${stClass}">${escapeHtml(r.estado)}</span></div></div>
        <div class="card-row"><div class="k">Tiempo</div><div class="v"><span class="badge badge-time">${escapeHtml(r.tiempo)}</span></div></div>
        <div class="card-row"><div class="k">Ejecutado</div><div class="v">${escapeHtml(ejecutado)}</div></div>
        <div class="card-row"><div class="k">Registro</div><div class="v">${escapeHtml(registro)}</div></div>
        <div class="card-row"><div class="k">Proyectado</div><div class="v">${escapeHtml(formatDateTime(r.proyectado))}</div></div>
        <div class="card-row"><div class="k">Labores</div><div class="v">${escapeHtml(r.labores)}</div></div>
      </div>
    `;
    }).join("");
  }
}

async function load() {
  setTopStatus("idle", "Cargando...");
  setMsg("Cargando registros...");
  rows.innerHTML = `<tr><td colspan="8">Cargando...</td></tr>`;

  // 1) Config: cache en navegador (10 min)
  //    Esto evita pedir config cada vez que entras a /ver.html.
  const CFG_CACHE_KEY = "plan_cfg_v1";
  const CFG_CACHE_TTL_MS = 10 * 60 * 1000;
  const cachedRaw = localStorage.getItem(CFG_CACHE_KEY);
  const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
  const now = Date.now();

  // 2) Pedimos config + list en paralelo para que cargue más rápido.
  const cfgPromise = (cached && (now - cached.ts) < CFG_CACHE_TTL_MS)
    ? Promise.resolve({ ok: true, config: cached.config })
    : API.get("config");

  const listPromise = API.get("list");

  const [cfgRes, res] = await Promise.all([cfgPromise, listPromise]);

  CONFIG = cfgRes.config;

  // Guardar config en cache del navegador
  if (!cached || (now - cached.ts) >= CFG_CACHE_TTL_MS) {
    localStorage.setItem(CFG_CACHE_KEY, JSON.stringify({ ts: now, config: CONFIG }));
  }

  buildSelect(fArea, CONFIG.areas, "Área: Todas");
  buildSelect(
    fEstado,
    (CONFIG && CONFIG.estados && CONFIG.estados.length)
      ? CONFIG.estados
      : ["Pendiente", "Concluido", "Finalizado", "Pausado", "Anulado", "Suspendido"],
    "Estado: Todos"
  );

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
