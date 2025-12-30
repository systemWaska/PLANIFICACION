const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxRYj6GaB8O7q-reEmLTPuZsoDDNQo9Gp_MDlJaFTJ-MiCF5vZ5DRk7gptwDYjA85G4UQ/exec";

const $ = (sel) => document.querySelector(sel);

const form = $("#taskForm");
const areaSelect = $("#area");
const solicitanteSelect = $("#solicitante");
const prioridadSelect = $("#prioridad");
const tiempoInput = $("#tiempo");
const labores = $("#labores");

const msg = $("#msg");
const submitBtn = $("#submitBtn");
const resetBtn = $("#resetBtn");
const spinner = $("#spinner");
const btnText = $("#btnText");
const chars = $("#chars");
const toast = $("#toast");

let CONFIG = null;

function setMessage(text, type = "") {
  msg.textContent = text || "";
  msg.className = `msg ${type}`.trim();
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  spinner.style.display = isLoading ? "inline-block" : "none";
  btnText.textContent = isLoading ? "Guardando..." : "Guardar";
}

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

function updateCharCount() {
  const n = (labores.value || "").length;
  chars.textContent = `${n} caracteres`;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function getFormData() {
  return {
    area: areaSelect.value.trim(),
    solicitante: solicitanteSelect.value.trim(),
    prioridad: prioridadSelect.value.trim(),
    labores: labores.value.trim(),
    tiempoEstimadoHoras: tiempoInput.value
  };
}

function validate(data) {
  if (!data.area) return "Selecciona un Área.";
  if (!data.solicitante) return "Selecciona un Solicitante.";
  if (!data.prioridad) return "Selecciona una Prioridad.";
  if (!data.tiempoEstimadoHoras) return "Ingresa el tiempo estimado (horas).";
  const hrs = Number(data.tiempoEstimadoHoras);
  if (!Number.isFinite(hrs) || hrs <= 0) return "Tiempo estimado inválido.";
  if (!data.labores || data.labores.length < 3) return "Describe la labor (mín. 3 caracteres).";
  return "";
}

async function loadConfig() {
  const url = `${APPS_SCRIPT_WEBAPP_URL}?action=config`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "No se pudo cargar config.");

  CONFIG = json.config;

  buildOptions(areaSelect, CONFIG.areas, "Selecciona un área");
  buildOptions(prioridadSelect, CONFIG.prioridades, "Selecciona prioridad");

  solicitanteSelect.disabled = true;
  buildOptions(solicitanteSelect, [], "Selecciona primero un área");
}

function onAreaChange() {
  const area = areaSelect.value;
  const solicitantes = CONFIG?.solicitanteByArea?.[area] || [];

  if (!area || solicitantes.length === 0) {
    solicitanteSelect.disabled = true;
    buildOptions(solicitanteSelect, [], "Selecciona primero un área");
    return;
  }

  solicitanteSelect.disabled = false;
  buildOptions(solicitanteSelect, solicitantes, "Selecciona solicitante");
}

async function postToAppsScript(payload) {
  const res = await fetch(APPS_SCRIPT_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error("Respuesta inválida del servidor."); }
  if (!json.ok) throw new Error(json.error || "Error guardando en el Sheet.");
  return json;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("");

  try {
    if (!CONFIG) throw new Error("Config no cargada.");

    const data = getFormData();
    const err = validate(data);
    if (err) {
      setMessage(err, "err");
      return;
    }

    setLoading(true);
    const result = await postToAppsScript(data);

    showToast(`${result.solicitante || data.solicitante}, tu planificación se guardó con éxito.`);
    setMessage(`Guardado ✅ (Fila: ${result.row})`, "ok");

    form.reset();
    solicitanteSelect.disabled = true;
    buildOptions(solicitanteSelect, [], "Selecciona primero un área");
    updateCharCount();
  } catch (error) {
    setMessage(error.message || "Error enviando la información.", "err");
  } finally {
    setLoading(false);
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  setMessage("");
  solicitanteSelect.disabled = true;
  buildOptions(solicitanteSelect, [], "Selecciona primero un área");
  updateCharCount();
});

areaSelect.addEventListener("change", onAreaChange);
labores.addEventListener("input", updateCharCount);

updateCharCount();
loadConfig().catch((e) => setMessage(e.message, "err"));
