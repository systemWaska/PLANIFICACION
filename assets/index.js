const { $, hideCurrentNav, initTheme } = UI;

// Oculta el botón de la pestaña donde estás (ej: si estás en "Inicio", oculta "Inicio")
initTheme();
hideCurrentNav();

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

(async () => {
  try {
    setTopStatus("idle", "Conectando...");
    await API.get("config");
    setTopStatus("ok", "Conectado");
  } catch (e) {
    setTopStatus("err", "Sin conexión");
    UI.toast(e.message || "Error de conexión", "err");
  }
})();
