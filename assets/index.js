// index.js — Carga resumen y próximas planificaciones
document.addEventListener("DOMContentLoaded", async () => {
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  function setTopStatus(state, text) {
    const colors = {
      ok: "rgba(34,197,94,.9)",
      warn: "rgba(250,204,21,.9)",
      err: "rgba(239,68,68,.9)",
      idle: "rgba(148,163,184,.7)"
    };
    statusDot.style.background = colors[state] || colors.idle;
    statusText.textContent = text;
  }

  setTopStatus("idle", "Cargando resumen...");

  try {
    // Cargar resumen
    const summaryRes = await API.get("summary");
    if (!summaryRes.ok) throw new Error("Error al cargar resumen");

    const s = summaryRes.summary;
    document.getElementById("kpi-pendiente").textContent = s.pendiente || 0;
    document.getElementById("kpi-finalizado").textContent = s.finalizado || 0;
    document.getElementById("kpi-vencidos").textContent = s.vencidos || 0;
    document.getElementById("kpi-porVencer").textContent = s.porVencer48 || 0;
    document.getElementById("kpi-total").textContent = s.total || 0;

    // Cargar próximas a vencer (filtrar por proyectado <= +3 días)
    const listRes = await API.post("list", { limit: 5 });
    if (!listRes.ok) throw new Error("Error al cargar lista");

    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcoming = (listRes.rows || [])
      .filter(r => r.proyectado && new Date(r.proyectado) <= threeDays && r.estado === "Pendiente")
      .slice(0, 5);

    const container = document.getElementById("upcomingList");
    if (upcoming.length === 0) {
      container.innerHTML = `<div class="msg">No hay planificaciones próximas a vencer.</div>`;
      return;
    }

    let html = `<div class="table-wrap scroll-x"><table><thead><tr><th>ID</th><th>Área</th><th>Solicitante</th><th>Proyectado</th><th>Labores</th></tr></thead><tbody>`;
    upcoming.forEach(r => {
      html += `
        <tr>
          <td><b>${r.id}</b></td>
          <td>${r.area || ""}</td>
          <td>${r.solicitante || ""}</td>
          <td>${r.proyectado || ""}</td>
          <td>${(r.labores || "").substring(0, 40)}${r.labores?.length > 40 ? "..." : ""}</td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;

    setTopStatus("ok", "Listo");
  } catch (err) {
    console.error("Error en index:", err);
    setTopStatus("err", "Error");
    document.getElementById("upcomingList").innerHTML = 
      `<div class="msg">No se pudo cargar el resumen: ${err.message || "desconocido"}</div>`;
  }
});
