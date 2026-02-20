/* ver.js v3 */
const { $, escapeHtml: esc, debounce, estadoClass, dueClass, parseDateSafe, setStatus } = UI;

let DATA = [], CONFIG = null;
const tbody = $("#rows"), msgEl = $("#msg"), rowCount = $("#rowCount");

function fmtD(v) {
  if (!v) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}/.test(String(v))) return String(v).substring(0,10);
  const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString("es-PE");
}

function setMsg(t, type) { msgEl.textContent = t || ""; msgEl.className = "msg" + (type?" "+type:""); }

function buildSelect(sel, items, ph) {
  sel.innerHTML = `<option value="">${ph}</option>`;
  items.forEach(v => { const o = document.createElement("option"); o.value = o.textContent = v; sel.appendChild(o); });
}

function norm(s) { return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }

function applyFilters() {
  const q = norm($("#q").value), a = $("#fArea").value, e = $("#fEstado").value;
  const out = DATA.filter(r =>
    (!q || [r.id,r.area,r.solicitante,r.labores,r.estado,r.prioridad].some(f => norm(f).includes(q))) &&
    (!a || r.area === a) && (!e || r.estado === e)
  );
  renderRows(out);
}

function renderRows(rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-muted text-sm" style="text-align:center;padding:24px;">Sin resultados.</td></tr>`;
    rowCount.textContent = "0 registros";
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr class="${dueClass(r.proyectado, r.estado)}">
      <td class="td-id nowrap">${esc(r.id)}</td>
      <td class="text-sm">${esc(r.area)}</td>
      <td class="truncate td-title">${esc(r.solicitante)}</td>
      <td class="truncate" style="max-width:240px;">${esc(r.labores)}</td>
      <td><span class="badge ${estadoClass(r.estado)}">${esc(r.estado)}</span></td>
      <td class="text-sm">${esc(r.prioridad)}</td>
      <td class="nowrap text-sm">${esc(fmtD(r.proyectado))}</td>
      <td class="nowrap text-sm">${esc(fmtD(r.fecha))}</td>
      <td class="nowrap text-sm">${esc(fmtD(r.ejecutado))}</td>
    </tr>`).join("");
  rowCount.textContent = rows.length + " registros";
}

async function load() {
  UI.setStatus("idle", "Cargando...");
  setMsg("Cargando...", "warn");
  tbody.innerHTML = `<tr><td colspan="9" class="loading" style="text-align:center;padding:24px;">Cargando...</td></tr>`;
  try {
    const [cfgRes, listRes] = await Promise.all([ API.get("config"), API.get("list", { limit: 500 }) ]);
    CONFIG = cfgRes.config || {};
    DATA   = listRes.rows || [];
    buildSelect($("#fArea"), CONFIG.areas || [], "Todas las áreas");
    buildSelect($("#fEstado"), CONFIG.estados || [], "Todos los estados");
    applyFilters();
    setMsg("", "");
    UI.setStatus("ok", DATA.length + " registros");
  } catch (err) {
    setMsg("Error: " + err.message, "err");
    UI.setStatus("err", "Error");
    tbody.innerHTML = `<tr><td colspan="9" class="text-muted text-sm" style="text-align:center;padding:24px;">No se pudo cargar.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#refreshBtn")?.addEventListener("click", load);
  $("#q")?.addEventListener("input", debounce(applyFilters, 200));
  $("#fArea")?.addEventListener("change", applyFilters);
  $("#fEstado")?.addEventListener("change", applyFilters);
  load();
});
