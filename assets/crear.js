const { $, toast } = UI;

const form = $("#taskForm");
const area = $("#area");
const solicitante = $("#solicitante");
const prioridad = $("#prioridad");
const tiempo = $("#tiempo");
const labores = $("#labores");
const observacion = $("#observacion");
const msg = $("#msg");
const chars = $("#chars");
const submitBtn = $("#submitBtn");
const resetBtn = $("#resetBtn");

let CONFIG = null;

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

function resetSolicitante() {
  solicitante.disabled = true;
  buildSelect(solicitante, [], "Selecciona primero un área");
}

function onAreaChange() {
  const a = area.value;
  const list = (CONFIG && CONFIG.solicitanteByArea && CONFIG.solicitanteByArea[a]) || [];
  if (!a || !list.length) return resetSolicitante();

  solicitante.disabled = false;
  buildSelect(solicitante, list, "Selecciona solicitante");


}

function validate() {
  if (!area.value) return "Selecciona un Área.";
  if (!solicitante.value) return "Selecciona un Solicitante.";
  if (!prioridad.value) return "Selecciona una Prioridad.";
  if (!tiempo.value.trim()) return "Completa el Tiempo estimado.";
  if (!labores.value.trim() || labores.value.trim().length < 3) return "Describe la labor (mín. 3 caracteres).";
  return "";
}

function getPayload() {
  return {
    area: area.value.trim(),
    solicitante: solicitante.value.trim(),
    prioridad: prioridad.value.trim(),
    labores: labores.value.trim(),
    estado: "Pendiente",
    tiempo: tiempo.value.trim(),
    ejecutado: "",
    observacion: (observacion.value || "").trim()
  };
}

async function loadConfig() {
  setTopStatus("idle", "Conectando...");
  const { config } = await API.get("config");
  CONFIG = config;

  buildSelect(area, config.areas, "Selecciona un área");
  buildSelect(prioridad, config.prioridades, "Selecciona prioridad");
  resetSolicitante();



  setTopStatus("ok", "Conectado");
}

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
    const res = await API.post(payload);

    const name = payload.solicitante || "Tu";
    toast(`${name}, tu planificación se guardó con éxito.`, "ok");
    setMsg(`Guardado ✅ (Fila: ${res.row})`);

    form.reset();
    resetSolicitante();

    updateChars();
    setTopStatus("ok", "Guardado");
  } catch (e2) {
    setTopStatus("err", "Error");
    toast(e2.message || "Error guardando", "err");
    setMsg(e2.message || "Error guardando");
  } finally {
    submitBtn.disabled = false;
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  resetSolicitante();

  updateChars();
  setMsg("");
  setTopStatus("ok", "Conectado");
});

area.addEventListener("change", onAreaChange);
labores.addEventListener("input", updateChars);

updateChars();
loadConfig().catch((e) => {
  setTopStatus("err", "Sin conexión");
  UI.toast(e.message || "Error", "err");
  setMsg(e.message || "Error");
});
