// Inicialización común para todas las páginas
document.addEventListener('DOMContentLoaded', () => {
  try { if (window.UI && UI.initTheme) UI.initTheme(); } catch (e) {}
});
