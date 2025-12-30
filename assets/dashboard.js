const { $, toast, escapeHtml } = UI;

const kpi1 = $("#kpi1");
const kpi2 = $("#kpi2");
const kpi3 = $("#kpi3");
const topSolicitantes = $("#topSolicitantes");
const topTiempos = $("#topTiempos");
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
  return [...m.entries()].sort((a,b)=>b[1]-a[1]);
}

async function load() {
  setTopStatus("idle", "Cargando...");
  dashRows.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;

  const res = await API.get("list");
  const rows = res.rows || [];

  const total = rows.length;
  const pendientes = rows.filter(r => r.estado === "Pendiente").length;
  const concluidos = rows.filter(r => r.estado === "Concluido").length;

  kpi1.textContent = `Pendientes: ${pendientes}`;
  kpi2.textContent = `Concluidos: ${concluidos}`;
  kpi3.textContent = `Total: ${total}`;

  const topS = countBy(rows, "solicitante").slice(0, 8);
  topSolicitantes.innerHTML = topS.length
    ? topS.map(([k,v]) => `<div class="msg">• ${escapeHtml(k)}: ${v}</div>`).join("")
    : "—";

  const topT = countBy(rows, "tiempo").slice(0, 8);
  topTiempos.innerHTML = topT.length
    ? topT.map(([k,v]) => `<div class="msg">• ${escapeHtml(k)}: ${v}</div>`).join("")
    : "—";

  const last = rows.slice(0, 12);
  dashRows.innerHTML = last.length ? last.map((r) => `
    <tr>
      <td>${escapeHtml(r.area)}</td>
      <td>${escapeHtml(r.solicitante)}</td>
      <td><span class="badge">${escapeHtml(r.prioridad)}</span></td>
      <td><span class="badge">${escapeHtml(r.estado)}</span></td>
      <td>${escapeHtml(r.tiempo)}</td>
      <td>${escapeHtml(r.fechaRegistro)}</td>
    </tr>
  `).join("") : `<tr><td colspan="6">No hay registros.</td></tr>`;

  setTopStatus("ok", "Conectado");
}

load().catch((e) => {
  setTopStatus("err", "Error");
  toast(e.message || "Error", "err");
  dashRows.innerHTML = `<tr><td colspan="6">Error cargando.</td></tr>`;
});
