// crear.js — Versión mínima, sin riesgos
document.addEventListener("DOMContentLoaded", () => {
  const area = document.getElementById("area");
  const solicitante = document.getElementById("solicitante");
  const correo = document.getElementById("correo");
  const proyectado = document.getElementById("proyectado");
  const labores = document.getElementById("labores");
  const chars = document.getElementById("chars");
  const form = document.getElementById("taskForm");
  const submitBtn = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");
  const msg = document.getElementById("msg");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  let CONFIG = null;

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

  function updateChars() {
    chars.textContent = (labores.value || "").length;
  }

  function buildSelect(select, items, placeholder) {
    select.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
    items.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  }

  async function loadConfig() {
    setTopStatus("idle", "Cargando...");
    try {
      const res = await API.get("config");
      if (!res.ok) throw new Error(res.error);
      CONFIG = res.config;

      // Cargar áreas
      buildSelect(area, CONFIG.areas || [], "Selecciona un área");

      setTopStatus("ok", "Listo");
    } catch (err) {
      setTopStatus("err", "Error");
      console.error(err);
    }
  }

  // Eventos
  area.addEventListener("change", () => {
    if (!CONFIG) return;
    const users = CONFIG.usersByArea?.[area.value] || [];
    buildSelect(solicitante, users.map(u => u.usuario), "Selecciona solicitante");
    solicitante.disabled = users.length === 0;
  });

  solicitante.addEventListener("change", () => {
    if (!CONFIG || !area.value) return;
    const users = CONFIG.usersByArea?.[area.value] || [];
    const user = users.find(u => u.usuario === solicitante.value);
    correo.value = user?.email || "";
    correo.closest("div").style.display = user?.email ? "block" : "none";
  });

  labores.addEventListener("input", updateChars);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!area.value) { alert("Selecciona área"); return; }
    if (!solicitante.value) { alert("Selecciona solicitante"); return; }
    if (!proyectado.value) { alert("Selecciona fecha proyectada"); return; }

    try {
      submitBtn.disabled = true;
      setTopStatus("idle", "Guardando...");

      const payload = {
        area: area.value,
        solicitante: solicitante.value,
        email: correo.value,
        proyectadoDate: proyectado.value,
        labores: labores.value,
        estado: "Pendiente"
      };

      await API.post("create", payload);
      alert("✅ Guardado");
      form.reset();
      updateChars();
      setTopStatus("ok", "Listo");
    } catch (e) {
      alert("❌ Error: " + (e.message || "desconocido"));
      console.error(e);
    } finally {
      submitBtn.disabled = false;
    }
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    updateChars();
    msg.textContent = "";
    setTopStatus("ok", "Listo");
  });

  updateChars();
  loadConfig();
});
function updateCorreo() {
  if (!isConfigLoaded || !area.value || !solicitante.value) {
    document.getElementById("correo-container").style.display = "none";
    return;
  }

  const users = CONFIG.usersByArea?.[area.value] || [];
  const user = users.find(u => u.usuario === solicitante.value);
  const email = user?.email || "";

  const correoInput = document.getElementById("correo");
  const container = document.getElementById("correo-container");

  correoInput.value = email;
  container.style.display = email ? "block" : "none";
}
