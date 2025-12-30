// Crear planificación (front)
const $ = (s) => document.querySelector(s);

const statusDot = $("#statusDot");
const statusText = $("#statusText");

const form = $("#taskForm");
const areaSelect = $("#area");
const solicitanteSelect = $("#solicitante");
const prioridadSelect = $("#prioridad");
const tiempoInput = $("#tiempo");
const labores = $("#labores");
const observacion = $("#observacion");
const chars = $("#chars");
const submitBtn = $("#submitBtn");
const resetBtn = $("#resetBtn");

let CONFIG = null;

function setTopStatus(state, text) {
  statusText.textContent = text;
  const colors = { ok:"rgba(34,197,94,.9)", warn:"rgba(250,204,21,.9)", err:"rgba(239,68,68,.9)", idle:"rgba(148,163,184,.7)" };
  statusDot.style.background = colors[state] || colors.idle;
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

  if (window.EnhancedSelect) window.EnhancedSelect.enhanceSelect(select);
}

function setLoading(isLoading){
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Guardando…" : "Guardar";
}

function updateCharCount(){
  chars.textContent = `${(labores.value || "").length} caracteres`;
}

function clearInvalid(){
  [...form.querySelectorAll(".invalid")].forEach(el => el.classList.remove("invalid"));
}

function markInvalid(el){
  if (!el) return;
  el.classList.add("invalid");
}

function validate(data){
  clearInvalid();
  if (!data.area){ markInvalid(areaSelect); return "Selecciona un Área."; }
  if (!data.solicitante){ markInvalid(solicitanteSelect); return "Selecciona un Solicitante."; }
  if (!data.prioridad){ markInvalid(prioridadSelect); return "Selecciona una Prioridad."; }
  if (!data.tiempo || data.tiempo.trim().length < 1){ markInvalid(tiempoInput); return "Ingresa el Tiempo estimado."; }
  if (!data.labores || data.labores.trim().length < 3){ markInvalid(labores); return "Describe la labor (mín. 3 caracteres)."; }
  return "";
}

function onAreaChange(){
  const area = areaSelect.value;
  const solicitantes = CONFIG?.solicitanteByArea?.[area] || [];

  solicitanteSelect.disabled = !solicitantes.length;
  if (!solicitantes.length){
    buildOptions(solicitanteSelect, [], "Selecciona un área primero");
    return;
  }
  buildOptions(solicitanteSelect, solicitantes, "Selecciona solicitante");
}

async function loadConfig(){
  setTopStatus("idle","Conectando…");
  const json = await apiGet("config");

  CONFIG = json.config;

  buildOptions(areaSelect, CONFIG.areas, "Selecciona un área");
  buildOptions(prioridadSelect, CONFIG.prioridades, "Selecciona prioridad");

  solicitanteSelect.disabled = true;
  buildOptions(solicitanteSelect, [], "Selecciona un área primero");

  setTopStatus("ok","Conectado");
}

function getFormData(){
  return {
    area: areaSelect.value.trim(),
    solicitante: solicitanteSelect.value.trim(),
    prioridad: prioridadSelect.value.trim(),
    labores: labores.value.trim(),
    estado: "Pendiente",
    tiempo: (tiempoInput.value || "").trim(),
    observacion: (observacion.value || "").trim()
  };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try{
    if (!CONFIG) throw new Error("No hay configuración cargada.");
    const data = getFormData();
    const err = validate(data);
    if (err){
      setTopStatus("warn","Revisa campos");
      UI.toast(err, "warn");
      return;
    }

    setLoading(true);
    setTopStatus("idle","Guardando…");

    await apiPost(data);

    setTopStatus("ok","Guardado");
    UI.toast(`${data.solicitante}, tu planificación se guardó con éxito.`, "ok");

    form.reset();
    solicitanteSelect.disabled = true;
    buildOptions(solicitanteSelect, [], "Selecciona un área primero");
    updateCharCount();
    clearInvalid();
  }catch(err){
    setTopStatus("err","Error");
    UI.toast(err.message || "Error guardando.", "err");
  }finally{
    setLoading(false);
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  solicitanteSelect.disabled = true;
  buildOptions(solicitanteSelect, [], "Selecciona un área primero");
  updateCharCount();
  clearInvalid();
});

areaSelect.addEventListener("change", onAreaChange);
labores.addEventListener("input", updateCharCount);

updateCharCount();
loadConfig().catch((e)=>{
  setTopStatus("err","Sin conexión");
  UI.toast(e.message || "Sin conexión.", "err");
});
