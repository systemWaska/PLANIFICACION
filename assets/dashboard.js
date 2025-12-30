/* Dashboard */

const URL = window.APPS_SCRIPT_WEBAPP_URL;
const $ = (s) => document.querySelector(s);

const kTotal = $("#kTotal");
const kPend = $("#kPend");
const kConc = $("#kConc");
const kRetr = $("#kRetr");
const refreshBtn = $("#refreshBtn");
const asOf = $("#asOf");
const msg = $("#msg");

function showMsg(text, type) {
  if (!text) {
    msg.style.display = "none";
    msg.textContent = "";
    msg.className = "msg";
    return;
  }
  msg.style.display = "block";
  msg.textContent = text;
  msg.className = `msg ${type || ""}`.trim();
}

async function loadDashboard() {
  if (!URL) throw new Error("Configura la URL del Web App en assets/config.js");

  setStatus("idle", "Cargando…");
  showMsg("");

  const json = await fetchJson(`${URL}?action=dashboard`);
  const s = json.stats;

  kTotal.textContent = s.total ?? "—";
  kPend.textContent = s.pendientes ?? "—";
  kConc.textContent = s.concluidos ?? "—";
  kRetr.textContent = s.retrasados ?? "—";

  asOf.textContent = `Actualizado: ${s.as_of || "—"}`;
  setStatus("ok", "Conectado");
}

refreshBtn.addEventListener("click", () => {
  loadDashboard().catch(e => {
    setStatus("err", "Error");
    showMsg(e.message || "No se pudo cargar.", "err");
  });
});

loadDashboard().catch(e => {
  setStatus("err", "Error");
  showMsg(e.message || "No se pudo cargar.", "err");
});
