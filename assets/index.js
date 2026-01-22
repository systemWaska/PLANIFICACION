/* Home (index) */

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

async function loadHome() {
  const err = document.getElementById("homeError");
  if (err) err.hidden = true;

  try {
    const summary = await API.get({ action: "summary" });

    setText("mPend", summary.pending ?? "—");
    setText("mDone", summary.done ?? "—");
    setText("mSoon", summary.dueSoon ?? "—");
    setText("mLate", summary.overdue ?? "—");
    setText("mTotal", summary.total ?? "—");

    const recent = await API.get({ action: "list", limit: 6 });
    const tbody = document.getElementById("homeRecentBody");
    if (tbody) {
      tbody.innerHTML = "";
      const items = Array.isArray(recent.items) ? recent.items : [];
      if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="muted">Sin registros recientes.</td></tr>`;
      } else {
        for (const r of items) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><span class="mono">${escapeHtml(r.id)}</span></td>
            <td>${escapeHtml(r.area)}</td>
            <td>${escapeHtml(r.solicitante)}</td>
          `;
          tbody.appendChild(tr);
        }
      }
    }

    setText("statusDot", "●");
    setText("statusText", "Listo");
  } catch (e) {
    if (err) {
      err.hidden = false;
      err.textContent = (e && e.message) ? e.message : "No se pudo cargar el resumen.";
    }
    setText("statusDot", "●");
    setText("statusText", "Error");
  }
}

document.addEventListener("DOMContentLoaded", loadHome);
