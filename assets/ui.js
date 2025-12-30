/* Utilidades de UI: toast + helpers */

(function () {
  const wrapId = "toastWrap";

  function ensureWrap() {
    let wrap = document.getElementById(wrapId);
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = wrapId;
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  // toast(title, description, type)
  window.toast = function (title, description, type) {
    const wrap = ensureWrap();
    const t = document.createElement("div");
    t.className = `toast ${type || ""}`.trim();
    t.innerHTML = `
      <div class="t"></div>
      <div class="d"></div>
    `;
    t.querySelector(".t").textContent = title || "";
    t.querySelector(".d").textContent = description || "";
    wrap.appendChild(t);

    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(-6px)";
      t.style.transition = "all .25s ease";
      setTimeout(() => t.remove(), 280);
    }, 3800);
  };

  // fetch JSON con manejo de errores
  window.fetchJson = async function (url, options) {
    const res = await fetch(url, options || {});
    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); }
    catch { throw new Error("Respuesta inválida del servidor."); }
    if (!json.ok) throw new Error(json.error || "Error del servidor.");
    return json;
  };

  // estado superior (pill)
  window.setStatus = function (state, text) {
    const dot = document.getElementById("statusDot");
    const label = document.getElementById("statusText");
    if (!dot || !label) return;

    const colors = {
      ok: "rgba(34,197,94,.9)",
      warn: "rgba(250,204,21,.9)",
      err: "rgba(239,68,68,.9)",
      idle: "rgba(148,163,184,.7)",
    };
    dot.style.background = colors[state] || colors.idle;
    label.textContent = text || "";
  };
})();
