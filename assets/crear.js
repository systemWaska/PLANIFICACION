// crear.js — versión depurada y funcional
const { $, toast } = UI;

const form = $("#taskForm");
const area = $("#area");
const solicitante = $("#solicitante");
const correoInput = $("#correo");
const prioridad = $("#prioridad");
const proyectado = $("#proyectado");
const labores = $("#labores");
const observacion = $("#observacion");
const msg = $("#msg");
const chars = $("#chars");
const submitBtn = $("#submitBtn");
const resetBtn = $("#resetBtn");

let CONFIG = null;
let isConfigLoaded = false;

// --- Debug: mostrar estado ---
function log(msg) {
  console.log("[CREAR] ", msg);
}

// --- Funciones auxiliares ---
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

function buildSelect(select, items, placeholder) {
  select.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  opt0.disabled = true;
  opt0.selected = true;
  select.appendChild(opt0);

  (items || []).forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });
  // Forzar actualización visual (para algunos navegadores)
  select.dispatchEvent(new Event("change"));
}

function resetSolicitante() {
  solicitante.disabled = true;
  buildSelect(solicitante, [], "Selecciona primero un área");
  if (correoInput) correoInput.value = "";
}

// --- Actualizar solicitantes según área ---
function updateSolicitanteOptions(areaValue) {
  log(`updateSolicitanteOptions(${areaValue}) | configLoaded=${isConfigLoaded}`);
  
  if (!isConfigLoaded) {
    solicitante.disabled = true;
    buildSelect(solicitante, [], "Cargando...");
    return;
  }

  if (!areaValue) {
    resetSolicitante();
    return;
  }

  const users = CONFIG?.usersByArea?.[areaValue] || [];
  log(`Área "${areaValue}" → ${users.length} solicitantes`);

  if (users.length === 0) {
    solicitante.disabled = true;
    buildSelect(solicitante, [], "No hay solicitantes para esta área");
    return;
  }

  solicitante.disabled = false;
  buildSelect(solicitante, users.map(u => u.usuario), "Selecciona solicitante");
}

// --- Actualizar correo ---
function updateCorreo() {
  if (!isConfigLoaded || !area.value || !solicitante.value) {
    if (correoInput) correoInput.value = "";
    return;
  }

  const users = CONFIG.usersByArea?.[area.value] || [];
  const user = users.find(u => u.usuario === solicitante.value);
  const email = user?.email || "";

  if (correoInput) {
    correoInput.value = email;
    // Ocultar si no hay email
    const container = correoInput.closest(".field-correo") || correoInput.parentElement;
    if (container) {
      container.style.display = email ? "block" : "none";
    }
  }
}

// --- Validación ---
function validate() {
  if (!area.value) return "Selecciona un Área.";
  if (!solicitante.value) return "Selecciona un Solicitante.";
  if (!prioridad.value) return "Selecciona una Prioridad.";
  if (!proyectado.value) return "Selecciona una Fecha proyectada.";
  if (!labores.value.trim() || labores.value.trim().length < 3) return "Describe la labor (mín. 3 caracteres).";
  return "";
}

function getPayload() {
  return {
    area: area.value.trim(),
    solicitante: solicitante.value.trim(),
    email: (correoInput?.value || "").trim(),
    prioridad: prioridad.value.trim(),
    labores: labores.value.trim(),
    estado: "Pendiente",
    proyectadoDate: proyectado.value,
    observacion: (observacion.value || "").trim()
  };
}

// --- Cargar configuración ---
async function loadConfig() {
  setTopStatus("idle", "Cargando...");
  try {
    log("Llamando API.get('config')");
    const res = await API.get("config");
    log("Respuesta config:", res);

    if (!res.ok) throw new Error(res.error || "Config no válida");

    CONFIG = res.config;
    isConfigLoaded = true;

    // Cargar áreas y prioridades
    buildSelect(area, CONFIG.areas || [], "Selecciona un área");
    buildSelect(prioridad, CONFIG.prioridades || [], "Selecciona prioridad");

    // Si ya hay área seleccionada, actualizar solicitantes
    if (area.value) {
      updateSolicitanteOptions(area.value);
    }

    // Establecer fecha mínima
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    proyectado.min = now.toISOString().slice(0, 16);

    setTopStatus("ok", "Listo");
    log("✅ Config cargada exitosamente");
  } catch (err) {
    setTopStatus("err", "Error");
    toast("Error al cargar configuración: " + (err.message || "desconocido"), "err");
    console.error("❌ Error en loadConfig:", err);
    log("ERROR:", err);
  }
}

// --- Eventos ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = validate();
  if (err) {
    toast(err, "warn");
    setMsg(err);
    return;
  }

  try {
    submitBtn.disabled = true;
    setTopStatus("idle", "Guardando...");

    const payload = getPayload();
    const res = await API.post("create", payload);

    toast("Guardado ✅", "ok");
    form.reset();
    resetSolicitante();
    updateChars();
    setTopStatus("ok", "Listo");
  } catch (e) {
    console.error("Error submit:", e);
    toast("Error: " + (e.message || "desconocido"), "err");
  } finally {
    submitBtn.disabled = false;
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  resetSolicitante();
  updateChars();
  setMsg("");
  setTopStatus("ok", "Listo");
});

// --- Vincular eventos con retraso para asegurar DOM ---
setTimeout(() => {
  area.addEventListener("change", () => {
    log("Área cambiada a:", area.value);
    updateSolicitanteOptions(area.value);
  });

  solicitante.addEventListener("change", () => {
    log("Solicitante cambiado a:", solicitante.value);
    updateCorreo();
  });

  labores.addEventListener("input", () => {
    chars.textContent = labores.value.length;
  });
}, 100);

// Iniciar
updateChars();
loadConfig();
