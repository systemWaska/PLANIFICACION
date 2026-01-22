// index.js - Resumen para Inicio
document.addEventListener("DOMContentLoaded", async () => {
  const $pend = document.getElementById("kpiPend");
  const $done = document.getElementById("kpiDone");
  const $due  = document.getElementById("kpiDue");
  const $late = document.getElementById("kpiLate");
  const $total= document.getElementById("kpiTotal");
  const $recent = document.getElementById("recentBody");

  function set(el, v){ if (el) el.textContent = v; }

  function dtFromProjected(v){
    if (!v) return null;
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)){
      const [y,m,d] = v.split("-").map(Number);
      return new Date(y, m-1, d, 10, 0, 0); // 10:00 por defecto
    }
    const dt = new Date(v);
    if (isNaN(dt.getTime())) return null;
    return dt;
  }

  function fmtDate(v){
    if (!v) return "";
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)){
      const [y,m,d] = v.split("-").map(Number);
      return new Date(y, m-1, d).toLocaleDateString("es-PE");
    }
    const dt = new Date(v);
    if (isNaN(dt.getTime())) return String(v);
    return dt.toLocaleDateString("es-PE");
  }

  try {
    const rows = await API.get("list");
    const now = new Date();
    const doneStates = new Set(["Concluido","Finalizado","Finalizado hoy"]);

    let pend=0, done=0, due=0, late=0, total=0;

    (rows || []).forEach(r => {
      total++;
      const st = (r.estado || "").trim();
      const isDone = doneStates.has(st);
      if (isDone) done++; else pend++;

      const dt = dtFromProjected(r.proyectado);
      if (!dt || isDone) return;

      const diff = dt.getTime() - now.getTime();
      const hours = diff / 36e5;

      if (hours < 0) late++;
      else if (hours <= 48) due++;
    });

    set($pend, pend);
    set($done, done);
    set($due, due);
    set($late, late);
    set($total, total);

    // Recientes: últimos 6 por Fecha (si existe), sino por id
    const sorted = (rows || []).slice().sort((a,b) => {
      const da = new Date(a.fecha || a.createdAt || 0).getTime();
      const db = new Date(b.fecha || b.createdAt || 0).getTime();
      return (db||0) - (da||0);
    }).slice(0,6);

    if ($recent) {
      if (!sorted.length){
        $recent.innerHTML = '<tr><td colspan="5" class="muted">No hay registros.</td></tr>';
      } else {
        $recent.innerHTML = "";
        sorted.forEach(r => {
          const stClass = (window.UI && UI.stateClass) ? UI.stateClass(r.estado) : "";
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${r.id || ""}</td>
            <td>${r.area || ""}</td>
            <td>${r.solicitante || ""}</td>
            <td><span class="badge ${stClass}">${r.estado || ""}</span></td>
            <td>${fmtDate(r.proyectado)}</td>
          `;
          $recent.appendChild(tr);
        });
      }
    }
  } catch (e) {
    // si falla, no rompemos inicio
    if ($recent) $recent.innerHTML = '<tr><td colspan="5" class="muted">No se pudo cargar el resumen.</td></tr>';
  }
});
