const { $, toast, escapeHtml, hideCurrentNav, formatDateTime, stateClass, dueClass, initTheme } = UI;

initTheme();
hideCurrentNav();

const kpiPendientes = $("#kpi1");
const kpiConcluidos = $("#kpi2");
const kpiTotal = $("#kpi3");
const kpiPorVencer = $("#kpi4");
const kpiVencidos = $("#kpi5");

const topSolicitantes = $("#topSolicitantes");
const topTiempos = $("#topTiempos");
const alertsList = $("#alertsList");
const dashRows = $("#dashRows");

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

function countBy(list, key) {
  const m = new Map();
  list.forEach((r) => {
    const v = String(r[key] || "").trim() || "—";
    m.set(v, (m.get(v) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function parseDate(value) {
  if (!value) return null;
  const d = (value instanceof Date) ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function load() {
  setTopStatus("idle", "Cargando...");
  dashRows.innerHTML = `<tr><td colspan="7">Cargando...</td></tr>`;
  alertsList.innerHTML = `<div class="msg">Cargando...</div>`;

  const res = await API.get("list");
  const rows = res.rows || [];

  // --- KPIs ---
  const total = rows.length;
  const pendientes = rows.filter(r => r.estado === "Pendiente").length;
  const concluidos = rows.filter(r => r.estado === "Concluido" || r.estado === "Finalizado").length;

  // Alertas (UI): por vencer en 48h y vencidos
  const now = new Date();
  const DONE = new Set(["Concluido", "Finalizado", "Anulado"]);
  const windowMs = 48 * 60 * 60 * 1000; // 48 horas

  let porVencer = 0;
  let vencidos = 0;

  const alertRows = [];

  rows.forEach(r => {
    if (DONE.has(String(r.estado || ""))) return;
    const due = parseDate(r.proyectado);
    if (!due) return;

    const diff = due.getTime() - now.getTime();
    if (diff < 0) {
      vencidos += 1;
      alertRows.push({ ...r, _diff: diff, _due: due, _kind: "bad" });
    } else if (diff <= windowMs) {
      porVencer += 1;
      alertRows.push({ ...r, _diff: diff, _due: due, _kind: "warn" });
    }
  });

  kpiPendientes.textContent = `Pendientes: ${pendientes}`;
  kpiConcluidos.textContent = `Concluidos: ${concluidos}`;
  kpiTotal.textContent = `Total: ${total}`;
  kpiPorVencer.textContent = `Por vencer (48h): ${porVencer}`;
  kpiVencidos.textContent = `Vencidos: ${vencidos}`;

  // --- Top solicitantes / tiempos ---
  const topS = countBy(rows, "solicitante").slice(0, 8);
  topSolicitantes.innerHTML = topS.length
    ? topS.map(([k, v]) => `<div class="msg">• ${escapeHtml(k)}: ${v}</div>`).join("")
    : "—";

  const topT = countBy(rows, "tiempo").slice(0, 8);
  topTiempos.innerHTML = topT.length
    ? topT.map(([k, v]) => `<div class="msg">• ${escapeHtml(k)}: ${v}</div>`).join("")
    : "—";

  // --- Alertas list ---
  alertRows.sort((a, b) => a._due.getTime() - b._due.getTime());
  const topAlerts = alertRows.slice(0, 8);

  alertsList.innerHTML = topAlerts.length
    ? topAlerts.map(r => {
        const kindClass = r._kind === "bad" ? "alert-bad" : "alert-warn";
        return `
          <div class="alert-item ${kindClass}">
            <div class="alert-main">
              <div class="alert-title">${escapeHtml(r.id || "")}</div>
              <div class="alert-sub">${escapeHtml(r.area)} • ${escapeHtml(r.solicitante)}</div>
            </div>
            <div class="alert-side">
              <div class="badge ${escapeHtml(stateClass(r.estado))}">${escapeHtml(r.estado)}</div>
              <div class="alert-date">Vence: ${escapeHtml(formatDateTime(r.proyectado))}</div>
            </div>
          </div>
        `;
      }).join("")
    : `<div class="msg">No hay alertas por ahora.</div>`;

  // --- Últimos registros (tabla) ---
  const last = rows.slice(0, 12);
  dashRows.innerHTML = last.length ? last.map((r) => {
    const dueCls = dueClass(r.proyectado, r.estado);
    return `
      <tr class="${escapeHtml(dueCls)}">
        <td>${escapeHtml(r.area)}</td>
        <td>${escapeHtml(r.solicitante)}</td>
        <td><span class="badge">${escapeHtml(r.prioridad)}</span></td>
        <td><span class="badge ${escapeHtml(stateClass(r.estado))}">${escapeHtml(r.estado)}</span></td>
        <td><span class="badge badge-time">${escapeHtml(r.tiempo)}</span></td>
        <td>${escapeHtml(formatDateTime(r.proyectado))}</td>
        <td>${escapeHtml(formatDateTime(r.fechaRegistro))}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="7">No hay registros.</td></tr>`;

  setTopStatus("ok", "Conectado");
}

load().catch((e) => {
  setTopStatus("err", "Error");
  toast(e.message || "Error", "err");
  dashRows.innerHTML = `<tr><td colspan="7">Error cargando.</td></tr>`;
  alertsList.innerHTML = `<div class="msg">Error cargando alertas.</div>`;
});
