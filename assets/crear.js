/**
 * crear.js
 * Lógica de la página Crear:
 * - Carga config (áreas, solicitantes por área, prioridades)
 * - Maneja cascada Área -> Solicitante
 * - Valida campos
 * - POST action=create
 * - Toast de confirmación con el nombre (solicitante)
 */

const form = $("#taskForm");
const areaSelect = $("#area");
const solicitanteSelect = $("#solicitante");
const prioridadSelect = $("#prioridad");
const tiempoInput = $("#tiempo");
const labores = $("#labores");
const chars = $("#chars");
const submitBtn = $("#submitBtn");
const resetBtn = $("#resetBtn");

// Guardamos la config del backend en memoria para usarla en validación
let CONFIG = null;

/**
 * Rellena un <select> con opciones
 * @param {HTMLSelectElement} select
 * @param {string[]} items
 * @param {string} placeholder
 */
function buildOptions(select, items, placeholder) {
  select.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  opt0.disabled = true;
  opt0.selected = true;
  select.appendChild(opt0);

  (items || []).forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

/** Muestra contador de caracteres del textarea */
function updateCharCount() {
  chars.textContent = `${(labores.value || "").length} caracteres`;
}

/** Bloquea el botón mientras se guarda */
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Guardando..." : "Guardar";
}

/**
 * Carga config desde Apps Script:
 * areas, solicitantesByArea, prioridades
 */
async function loadConfig() {
  setTopStatus("idle", "Conectando...");

  const { config } = await apiGet({ action: "config" });

  CONFIG = config;

  buildOptions(areaSelect, CONFIG.areas, "Selecciona un área");
  buildOptions(prioridadSelect, CONFIG.prioridades, "Selecciona prioridad");

  solicitanteSelect.disabled = true;
  buildOptions(solicitanteSelect, [], "Selecciona primero un área");

  setTopStatus("ok", "Conectado");
}

/** Cuando cambia el área, actualizamos el select de solicitantes */
function onAreaChange() {
  const area = areaSelect.value;
  const list = CONFIG?.solicitantesByArea?.[area] || [];

  if (!area || list.length === 0) {
    solicitanteSelect.disabled = true;
    buildOptions(solicitanteSelect, [], "Selecciona primero un área");
    return;
  }

  solicitanteSelect.disabled = false;
  buildOptions(solicitanteSelect, list, "Selecciona solicitante");
}

/**
 * Valida campos obligatorios
 * Nota: Tiempo estimado ahora es texto libre (solo validamos no vacío)
 */
function validate(data) {
  if (!data.area) return "Selecciona un Área.";
  if (!data.solicitante) return "Selecciona un Solicitante.";
  if (!data.prioridad) return "Selecciona una Prioridad.";
  if (!data.labores || data.labores.trim().length < 3) return "Describe la labor (mín. 3 caracteres).";
  if (!data.tiempo_estimado) return "Ingresa el tiempo estimado (ej: 3 días).";

  // Validación simple anti-vacío/solo espacios
  if (data.tiempo_estimado.trim().length < 2) return "Tiempo estimado muy corto.";
  return "";
}

/** Prepara payload para enviar al backend */
function getFormData() {
  return {
    area: areaSelect.value.trim(),
    solicitante: solicitanteSelect.value.trim(),
    prioridad: prioridadSelect.value.trim(),
    labores: labores.value.trim(),
    tiempo_estimado: String(tiempoInput.value || "").trim(),
  };
}

/** Submit principal */
async function onSubmit(e) {
  e.preventDefault();

  if (!CONFIG) {
    toast("Error", "No hay configuración cargada.", "err");
    return;
  }

  const data = getFormData();

  const err = validate(data);
  if (err) {
    toast("Revisa campos", err, "err");
    return;
  }

  try {
    setLoading(true);
    setTopStatus("idle", "Guardando...");

    // action=create para que Apps Script sepa que crear
    const result = await apiPost({ action: "create", ...data });

    setTopStatus("ok", "Guardado");

    // Mensaje solicitado: "Angel, tu planificación se guardó con éxito."
    toast(`${data.solicitante}, tu planificación se guardó con éxito.`, `Fila: ${result.row}`, "ok");

    // Reset de formulario y select dependiente
    form.reset();
    solicitanteSelect.disabled = true;
    buildOptions(solicitanteSelect, [], "Selecciona primero un área");
    updateCharCount();
  } catch (error) {
    setTopStatus("err", "Error");
    toast("No se pudo guardar", error.message || "Error.", "err");
  } finally {
    setLoading(false);
  }
}

/** Reset manual */
function onReset() {
  form.reset();
  solicitanteSelect.disabled = true;
  buildOptions(solicitanteSelect, [], "Selecciona primero un área");
  updateCharCount();
  setTopStatus("ok", "Conectado");
}

/** Event listeners */
areaSelect.addEventListener("change", onAreaChange);
labores.addEventListener("input", updateCharCount);
form.addEventListener("submit", onSubmit);
resetBtn.addEventListener("click", onReset);

/** Init */
updateCharCount();
loadConfig().catch((e) => {
  setTopStatus("err", "Sin conexión");
  toast("Sin conexión", e.message, "err");
});
