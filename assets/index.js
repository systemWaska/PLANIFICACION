(() => {
  const $ = (sel) => document.querySelector(sel);
  const connPill = $("#connPill");

  function setConn(ok, text) {
    if (!connPill) return;
    connPill.textContent = text || (ok ? "Listo" : "Sin conexión");
    connPill.classList.toggle("pill-ok", !!ok);
    connPill.classList.toggle("pill-bad", !ok);
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = (v === undefined || v === null || v === "") ? "—" : String(v);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function load() {
    setConn(false, "Conectando...");
    try {
      const res = await API.get("summary");
      if (!res || res.ok === false) throw new Error((res && res.error) || "Respuesta inválida.");

      const s = res.summary || {};
      setText("sumPend", s.pendiente);
      setText("sumCon", s.finalizado);
      setText("sumVencer", s.porVencer48);
      setText("sumVenc", s.vencidos);
      setText("sumTotal", s.total);

      const body = $("#recentBody");
      if (body) {
        body.innerHTML = "";
        const rows = s.recent || [];
        if (!rows.length) {
          body.innerHTML = `<tr><td colspan="5" class="muted">Sin registros.</td></tr>`;
        } else {
          rows.forEach(r => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td><b>${escapeHtml(r.id)}</b></td>
              <td>${escapeHtml(r.area)}</td>
              <td>${escapeHtml(r.solicitante)}</td>
              <td><span class="tag">${escapeHtml(r.estado)}</span></td>
              <td>${escapeHtml(r.fecha)}</td>
            `;
            body.appendChild(tr);
          });
        }
      }

      setConn(true, "Listo");
    } catch (e) {
      setConn(false, "Error");
      const body = $("#recentBody");
      if (body) body.innerHTML = `<tr><td colspan="5" class="muted">No se pudo cargar el resumen.</td></tr>`;
    }
  }

  load();
})();
