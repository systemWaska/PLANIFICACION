/* index.js v3 */
document.addEventListener("DOMContentLoaded", async () => {
  UI.setStatus("idle", "Cargando...");
  const { escapeHtml: esc, estadoClass, parseDateSafe, formatDateTime, fmtDate } = UI;

  function fmtD(v) {
    if (!v) return "—";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(String(v))) return String(v).substring(0, 10);
    const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString("es-PE");
  }

  try {
    const [sumRes, listRes] = await Promise.all([
      API.get("summary"),
      API.get("list", { limit: 50 })
    ]);

    /* KPIs */
    if (sumRes.ok) {
      const s = sumRes.summary;
      document.getElementById("kpi-pend").textContent = s.pendiente || 0;
      document.getElementById("kpi-venc").textContent = s.vencidos  || 0;
      document.getElementById("kpi-prox").textContent = s.porVencer48 || 0;
      document.getElementById("kpi-fin").textContent  = s.finalizado || 0;
      document.getElementById("kpi-tot").textContent  = s.total || 0;
      document.querySelectorAll(".kpi-card").forEach(c => c.classList.remove("loading"));
    }

    /* Próximas */
    const rows = listRes.rows || [];
    const now  = new Date(), t3d = new Date(now.getTime() + 3*86400000);
    const upcoming = rows.filter(r => {
      if (!/pendiente/i.test(r.estado)) return false;
      const d = parseDateSafe(r.proyectado);
      return d && d >= now && d <= t3d;
    }).slice(0, 7);

    const upEl = document.getElementById("upcomingList");
    if (!upcoming.length) {
      upEl.innerHTML = `<div class="text-muted text-sm" style="padding:16px 0;text-align:center;">Sin planificaciones próximas a vencer 🎉</div>`;
    } else {
      upEl.innerHTML = upcoming.map(r => {
        const d = parseDateSafe(r.proyectado);
        const diffH = d ? Math.round((d - now) / 3600000) : null;
        const urgency = diffH !== null && diffH < 24 ? "text-red" : "text-muted";
        return `
          <div class="upcoming-item">
            <div class="upcoming-id">${esc(r.id)}</div>
            <div class="upcoming-who">
              ${esc(r.area)} · ${esc(r.solicitante)}
              <span>${esc((r.labores||"").substring(0,50))}</span>
            </div>
            <div class="upcoming-date ${urgency}">${fmtD(r.proyectado)}${diffH!==null?`<br><span style="font-size:10px;">${diffH}h</span>`:""}</div>
          </div>`;
      }).join("");
    }

    /* Últimas filas */
    const last6 = rows.slice(-6).reverse();
    const tbody = document.getElementById("recentRows");
    tbody.innerHTML = last6.length ? last6.map(r => `
      <tr class="${UI.dueClass(r.proyectado, r.estado)}">
        <td class="td-id">${esc(r.id)}</td>
        <td>${esc(r.area)}</td>
        <td class="td-title truncate">${esc(r.solicitante)}</td>
        <td><span class="badge ${estadoClass(r.estado)}">${esc(r.estado)}</span></td>
        <td>${esc(fmtD(r.proyectado))}</td>
        <td>${esc(fmtD(r.fecha))}</td>
      </tr>`).join("") : `<tr><td colspan="6" class="text-muted text-sm" style="text-align:center;">Sin registros.</td></tr>`;

    UI.setStatus("ok", "Listo");
  } catch (err) {
    UI.setStatus("err", "Error");
    console.error(err);
  }
});
