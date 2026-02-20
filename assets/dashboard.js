/* dashboard.js v3 */
const { $, escapeHtml: esc, estadoClass, dueClass, parseDateSafe } = UI;

function fmtD(v) {
  if (!v) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}/.test(String(v))) return String(v).substring(0,10);
  const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString("es-PE");
}

function countBy(list, key) {
  const m = new Map();
  list.forEach(r => { const v = String(r[key]||"").trim()||"—"; m.set(v,(m.get(v)||0)+1); });
  return [...m.entries()].sort((a,b) => b[1]-a[1]);
}

function renderBars(el, entries, max, color) {
  el.innerHTML = entries.slice(0,8).map(([k,v]) => `
    <div class="bar-item">
      <div class="bar-label" title="${esc(k)}">${esc(k)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/max*100)}%;background:${color||'var(--teal)'};"></div></div>
      <div class="bar-count">${v}</div>
    </div>`).join("") || `<div class="text-muted text-sm">Sin datos.</div>`;
}

async function load() {
  UI.setStatus("idle", "Cargando...");
  try {
    const res = await API.get("list", { limit: 500 });
    const rows = res.rows || [];
    const now  = new Date();
    const DONE = new Set(["Concluido","Finalizado","Anulado"]);
    const W48  = 48 * 3600000;

    /* KPIs */
    const pend = rows.filter(r => /pendiente/i.test(r.estado)).length;
    const fin  = rows.filter(r => /finaliz|conclu/i.test(r.estado)).length;
    let prox = 0, venc = 0;
    const alertRows = [];

    rows.forEach(r => {
      if (DONE.has(r.estado)) return;
      const d = parseDateSafe(r.proyectado); if (!d) return;
      const diff = d - now;
      if (diff < 0)     { venc++; alertRows.push({...r, _d:d, _kind:"bad"}); }
      else if (diff<=W48){ prox++; alertRows.push({...r, _d:d, _kind:"warn"}); }
    });

    $("#kpi-pend").textContent = pend; $("#kpi-pend").classList.remove("loading");
    $("#kpi-fin").textContent  = fin;  $("#kpi-fin").classList.remove("loading");
    $("#kpi-prox").textContent = prox; $("#kpi-prox").classList.remove("loading");
    $("#kpi-venc").textContent = venc; $("#kpi-venc").classList.remove("loading");
    $("#kpi-tot").textContent  = rows.length; $("#kpi-tot").classList.remove("loading");

    /* Alertas */
    alertRows.sort((a,b) => a._d - b._d);
    const alertEl = $("#alertsList");
    alertEl.innerHTML = alertRows.slice(0,8).map(r => {
      const isBad = r._kind === "bad";
      const diffH = Math.abs(Math.round((r._d - now) / 3600000));
      return `
        <div class="alert-item ${isBad?'a-bad':'a-warn'}">
          <div>
            <div class="alert-id">${esc(r.id)}</div>
            <div class="alert-who">${esc(r.area)} · ${esc(r.solicitante)}</div>
            <div class="alert-meta">${esc((r.labores||"").substring(0,50))}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <span class="badge ${estadoClass(r.estado)}">${esc(r.estado)}</span>
            <div class="alert-date" style="margin-top:4px;">${isBad?'Venció':'Vence'}: ${esc(fmtD(r.proyectado))}<br><span style="font-size:10px;">${diffH}h ${isBad?"atrás":"restantes"}</span></div>
          </div>
        </div>`;
    }).join("") || `<div class="text-muted text-sm" style="padding:12px 0;">✅ Sin alertas activas.</div>`;

    /* Tops */
    const topS = countBy(rows, "solicitante");
    const topA = countBy(rows, "area");
    const topE = countBy(rows, "estado");
    const maxS = topS[0]?.[1] || 1;
    const maxA = topA[0]?.[1] || 1;
    const maxE = topE[0]?.[1] || 1;

    renderBars($("#topSolicitantes"), topS, maxS, "var(--violet)");
    renderBars($("#topAreas"),        topA, maxA, "var(--amber)");
    renderBars($("#byEstado"),        topE, maxE, "var(--teal)");

    /* Tabla últimas */
    const last = rows.slice(-10).reverse();
    $("#dashRows").innerHTML = last.length ? last.map(r => `
      <tr class="${dueClass(r.proyectado, r.estado)}">
        <td class="td-id nowrap">${esc(r.id)}</td>
        <td class="text-sm">${esc(r.area)}</td>
        <td class="truncate td-title">${esc(r.solicitante)}</td>
        <td><span class="badge ${estadoClass(r.estado)}">${esc(r.estado)}</span></td>
        <td class="text-sm"><span class="badge badge-gray">${esc(r.prioridad)}</span></td>
        <td class="nowrap text-sm">${esc(fmtD(r.proyectado))}</td>
        <td class="nowrap text-sm">${esc(fmtD(r.fecha))}</td>
      </tr>`).join("") : `<tr><td colspan="7" class="text-muted text-sm" style="text-align:center;padding:20px;">Sin registros.</td></tr>`;

    UI.setStatus("ok", "Listo · " + rows.length + " registros");
  } catch (err) {
    UI.setStatus("err", "Error");
    UI.toast(err.message || "Error al cargar", "err");
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", load);
