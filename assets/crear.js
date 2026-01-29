// Página: CREAR (formulario)
const { $, toast } = UI;

const form = $("#taskForm");
const area = $("#area");
const solicitante = $("#solicitante");
const correoContainer = document.querySelector('.field-correo'); // ver HTML abajo
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

function setMsg(t) {
  msg.textContent = t || "";
}

function updateChars() {
  chars.textContent = `${(labores.value || "").length} caracteres`;
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
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

// --- Gestión del estado de solicitante y correo ---
function updateSolicitanteOptions(areaValue) {
  if (!isConfigLoaded) {
    solicitante.disabled = true;
    buildSelect(solicitante, [], "Cargando...");
    correoInput.value = "";
    return;
  }

  const list = (CONFIG && CONFIG.solicitanteByArea && CONFIG.solicitanteByArea[areaValue]) || [];
  
  if (!areaValue || list.length === 0) {
    solicitante.disabled = true;
    buildSelect(solicitante, [], "Selecciona primero un área");
    hideCorreo();
    return;
  }

  solicitante.disabled = false;
  buildSelect(solicitante, list, "Selecciona solicitante");
  showCorreo(); // siempre mostramos el contenedor; luego decidimos si se llena
}

function updateCorreoFromSolicitante() {
  if (!isConfigLoaded || !area.value || !solicitante.value) {
    correoInput.value = "";
    hideCorreo();
    return;
  }

  const areaVal = area.value;
  const solVal = solicitante.value;
  const users = CONFIG.solicitanteByArea?.[areaVal] || [];
  const user = users.find(u => u.usuario === solVal);

  if (user && user.email) {
    correoInput.value = user.email;
    showCorreo();
  } else {
    correoInput.value = "";
    hideCorreo(); // ocultar si no hay correo registrado
  }
}

function showCorreo() {
  if (correoContainer) correoContainer.style.display = "block";
}
function hideCorreo() {
  if (correoContainer) correoContainer.style.display = "none";
}

// --- Validación y payload ---
function validate() {
  if (!area.value) return "Selecciona un Área.";
  if (!solicitante.value) return "Selecciona un Solicitante.";
  if (!prioridad.value) return "Selecciona una Prioridad.";
  if (!proyectado.value) return "Selecciona una Fecha proyectada.";
  if (!labores.value.trim() || labores.value.trim().length < 3) return "Describe la labor (mín. 3 caracteres).";
  return "";
}

function getPayload() {
  const email = correoInput.value.trim() || "";
  return {
    area: area.value.trim(),
    solicitante: solicitante.value.trim(),
    email: email,
    prioridad: prioridad.value.trim(),
    labores: labores.value.trim(),
    estado: "Pendiente",
    proyectadoDate: proyectado.value,
    observacion: (observacion.value || "").trim()
  };
}

async function loadConfig() {
  setTopStatus("idle", "Cargando configuración...");
  try {
    const res = await API.get("config");
    if (!res.ok) throw new Error(res.error || "Error al cargar configuración");
    
    CONFIG = res.config;
    isConfigLoaded = true;

    buildSelect(area, CONFIG.areas, "Selecciona un área");
    buildSelect(prioridad, CONFIG.prioridades, "Selecciona prioridad");

    // Inicializar solicitudes (si ya hay área seleccionada)
    if (area.value) updateSolicitanteOptions(area.value);

    // Establecer fecha mínima = ahora + 30 min
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    proyectado.min = now.toISOString().slice(0, 16);

    setTopStatus("ok", "Listo");
  } catch (err) {
    setTopStatus("err", "Error");
    toast(err.message || "No se pudo cargar la configuración", "err");
    console.error("Config load error:", err);
  }
}

// --- Eventos ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("");

  const err = validate();
  if (err) {
    setTopStatus("warn", "Revisa campos");
    toast(err, "warn");
    setMsg(err);
    return;
  }

  try {
    submitBtn.disabled = true;
    setTopStatus("idle", "Guardando...");

    const payload = getPayload();
    const res = await API.post("create", payload);

    UI.showPlanningSavedModal({ id: res.id || "", user: payload.solicitante || "" });
    toast(`${payload.solicitante}, planificación guardada ✅`, "ok");
    setMsg(`Guardado (ID: ${res.id})`);

    form.reset();
    resetForm();
    updateChars();
    setTopStatus("ok", "Listo");
  } catch (e2) {
    setTopStatus("err", "Error");
    toast(e2.message || "Error al guardar", "err");
    setMsg(e2.message || "Error");
  } finally {
    submitBtn.disabled = false;
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  resetForm();
  updateChars();
  setMsg("");
  setTopStatus("ok", "Listo");
});

// Manejo dinámico de cambios
area.addEventListener("change", () => {
  updateSolicitanteOptions(area.value);
});
solicitante.addEventListener("change", updateCorreoFromSolicitante);
labores.addEventListener("input", updateChars);

function resetForm() {
  solicitante.disabled = true;
  buildSelect(solicitante, [], "Selecciona primero un área");
  correoInput.value = "";
  hideCorreo();
}

// Iniciar
updateChars();
loadConfig();

// --- Soporte para el contenedor de correo ---
// Si no existe, creamos un contenedor dinámico para controlar visibilidad
if (correoInput.parentElement.classList.contains("hint")) {
  const container = document.createElement("div");
  container.className = "field-correo";
  container.style.marginTop = "10px";
  container.innerHTML = `
    <label>Correo (auto)</label>
    <input id="correo" type="email" placeholder="Se completa al elegir solicitante" disabled />
  `;
  correoInput.replaceWith(container.querySelector("input"));
  correoInput = container.querySelector("input");
  correoContainer = container;
  // Insertar antes del siguiente elemento (ej: antes de .grid2)
  const parent = area.closest(".grid2");
  if (parent) {
    const next = parent.children[1];
    parent.insertBefore(container, next);
  }
}
