/* Cerrar planificación (DNI) - Versión completa */
(() => {
  const $area = document.getElementById("area");
  const $sol = document.getElementById("solicitante");
  const $dni = document.getElementById("dni");
  const $dni2 = document.getElementById("dni2");
  const $dniRegister = document.getElementById("dniRegister");
  const $authMsg = document.getElementById("authMsg");
  const $btnReload = document.getElementById("btnReload");

  const $tbody = document.getElementById("tbody");
  const $closeCard = document.getElementById("closeCard");
  const $closeMeta = document.getElementById("closeMeta");
  const $closeId = document.getElementById("closeId");
  const $updateText = document.getElementById("updateText");
  const $closeMsg = document.getElementById("closeMsg");
  const $btnCancelClose = document.getElementById("btnCancelClose");

  // === NUEVO: elementos del modal de detalle ===
  const detailModal = document.getElementById("detailModal");
  const detailTitle = document.getElementById("detailTitle");
  const detailContent = document.getElementById("detailContent");
  const detailForm = document.getElementById("detailForm");
  const detailObservacion = document.getElementById("detailObservacion");
  const detailEstado = document.getElementById("detailEstado");
  const detailMsg = document.getElementById("detailMsg");
  const btnCancelDetail = document.getElementById("btnCancelDetail");

  const state = {
    cfg: null,
    authed: false,
    area: "",
    solicitante: "",
    dni: ""
  };

  function setMsg(el, text, type) {
    el.textContent = text || "";
    el.classList.remove("ok", "warn", "err");
    if (type) el.classList.add(type);
  }

  function isValidDni(v) {
    return /^\d{8}$/.test(String(v || "").trim());
  }

  async function loadConfig() {
    setMsg($authMsg, "Cargando configuración...", "warn");
    const res = await API.get("config");
    const cfg = (res && res.config) ? res.config : res;
    state.cfg = cfg;
    $area.innerHTML = '<option value="">Selecciona un área</option>';
    (cfg.areas || []).forEach(a => {
      const opt = document.createElement("option");
      opt.value = a;
      opt.textContent = a;
      $area.appendChild(opt);
    });
    setMsg($authMsg, "", "");
  }

  function fillSolicitantes() {
    const area = $area.value;
    $sol.disabled = !area;
    $sol.innerHTML = area
      ? '<option value="">Selecciona un usuario</option>'
      : '<option value="">Selecciona primero un área</option>';

    if (!area || !state.cfg) return;
    const list = (state.cfg.usersByArea?.[area] || []).map(u => ({ usuario: u.usuario }));
    list.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.usuario;
      opt.textContent = p.usuario;
      $sol.appendChild(opt);
    });
  }

  async function authFlow(e) {
    e.preventDefault();
    const area = $area.value;
    const sol = $sol.value;
    const dni = $dni.value.trim();

    if (!area || !sol) return setMsg($authMsg, "Selecciona Área y Usuario.", "err");
    if (!isValidDni(dni)) return setMsg($authMsg, "El DNI debe tener 8 dígitos.", "err");

    setMsg($authMsg, "Validando...", "warn");

    const res = await API.post({
      action: "listMine",
      area,
      usuario: sol,
      dni
    });

    if (res && res.requireRegisterDni) {
      $dniRegister.classList.remove("hidden");
      setMsg($authMsg, "Este usuario aún no tiene DNI registrado. Ingresa el DNI y confírmalo para registrarlo.", "warn");
      return;
    }

    if (!res || res.ok !== true) {
      setMsg($authMsg, (res && (res.error || res.message)) || "No se pudo validar.", "err");
      return;
    }

    $dniRegister.classList.add("hidden");
    state.authed = true;
    state.area = area;
    state.solicitante = sol;
    state.dni = dni;
    setMsg($authMsg, "Acceso correcto. Cargando registros...", "ok");
    await loadMyPlans();
  }

  async function registerDniIfNeeded() {
    const area = $area.value;
    const sol = $sol.value;
    const dni = $dni.value.trim();
    const dni2 = $dni2.value.trim();

    if (!$dniRegister.classList.contains("hidden")) {
      if (!isValidDni(dni) || !isValidDni(dni2)) {
        setMsg($authMsg, "Para registrar DNI, ambos deben tener 8 dígitos.", "err");
        return false;
      }
      if (dni !== dni2) {
        setMsg($authMsg, "Los DNI no coinciden.", "err");
        return false;
      }

      setMsg($authMsg, "Registrando DNI...", "warn");
      const res = await API.post({
        action: "registerDni",
        area,
        usuario: sol,
        dni
      });

      if (!res || res.ok !== true) {
        setMsg($authMsg, (res && (res.error || res.message)) || "No se pudo registrar DNI.", "err");
        return false;
      }
      setMsg($authMsg, "DNI registrado. Validando acceso...", "ok");
      $dniRegister.classList.add("hidden");
      return true;
    }
    return true;
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const ok = await registerDniIfNeeded();
    if (!ok) return;
    await authFlow(e);
  }

  function renderEmpty(text) {
    $tbody.innerHTML = `<tr><td colspan="5" class="muted">${text}</td></tr>`;
  }

  function fmtDateOnly(v) {
    if (!v) return "";
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y,m,d] = v.split("-").map(Number);
      return new Date(y, m-1, d).toLocaleDateString("es-PE");
    }
    const dt = new Date(v);
    if (isNaN(dt.getTime())) return String(v);
    return dt.toLocaleDateString("es-PE");
  }

  async function loadMyPlans() {
    if (!state.authed) return renderEmpty("Ingresa para ver tus registros.");

    const res = await API.post({
      action: "listMine",
      area: state.area,
      usuario: state.solicitante,
      dni: state.dni
    });

    if (!res || res.ok !== true) {
      renderEmpty((res && (res.error || res.message)) || "No se pudo cargar.");
      return;
    }

    const rows = (res.rows || []).filter(r => ["Pendiente", "Pausado"].includes(r.estado));
    if (!rows.length) return renderEmpty("No tienes registros Pendiente/Pausado.");

    $tbody.innerHTML = "";
    rows.forEach(r => {
      const tr = document.createElement("tr");
      const stClass = (window.UI && UI.stateClass) ? UI.stateClass(r.estado) : "";
      tr.innerHTML = `
        <td>${r.id || ""}</td>
        <td><span class="badge">${r.prioridad || ""}</span></td>
        <td><span class="badge ${stClass}">${r.estado || ""}</span></td>
        <td>${fmtDateOnly(r.proyectado)}</td>
        <td><button class="btn small" data-close="${r.id}">Finalizar</button></td>
      `;
      $tbody.appendChild(tr);
    });

    $tbody.querySelectorAll("[data-close]").forEach(btn => {
      btn.addEventListener("click", () => openDetailModalFromRow(r)); // 👈 abrir modal de detalle
    });
  }

  // === NUEVO: Abrir modal de detalle ===
  function openDetailModalFromRow(plan) {
    // Guardar datos temporales
    window.TEMP_PLAN = plan;
    openDetailModal(plan);
  }

  function openDetailModal(plan) {
    detailMsg.textContent = "";
    detailObservacion.value = "";
    detailEstado.value = "Finalizado";

    detailTitle.textContent = `Planificación ${plan.id}`;
    const html = `
      <div class="modal-kv"><span>Área:</span> <b>${plan.area || ""}</b></div>
      <div class="modal-kv"><span>Solicitante:</span> <b>${plan.solicitante || ""}</b></div>
      <div class="modal-kv"><span>Prioridad:</span> <b>${plan.prioridad || ""}</b></div>
      <div class="modal-kv"><span>Proyectado:</span> <b>${fmtDateOnly(plan.proyectado)}</b></div>
      <div class="modal-kv"><span>Fecha registro:</span> <b>${fmtDateOnly(plan.fecha)}</b></div>
      <div class="modal-kv"><span>Estado:</span> <b class="badge ${UI?.estadoClass?.(plan.estado) || ""}">${plan.estado || ""}</b></div>
      <div class="modal-kv" style="margin-top:12px;"><span>Labores:</span></div>
      <div style="text-align:left; margin:8px 0; padding:8px; background:var(--card2); border-radius:12px;">
        ${plan.labores || "Sin descripción"}
      </div>
    `;
    detailContent.innerHTML = html;
    detailForm.dataset.planId = plan.id;
    detailModal.classList.remove("hidden");
  }

  function closeDetailModal() {
    detailModal.classList.add("hidden");
  }

  // Eventos del modal
  btnCancelDetail.addEventListener("click", closeDetailModal);

  detailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = detailForm.dataset.planId;
    const obs = detailObservacion.value.trim();
    const nuevoEstado = detailEstado.value;

    if (!id) return;

    setMsg(detailMsg, "Actualizando...", "warn");
    try {
      const res = await API.post({
        action: "close",
        id,
        area: state.area,
        usuario: state.solicitante,
        dni: state.dni,
        nuevoEstado,
        note: obs
      });

      if (!res.ok) throw new Error(res.error || "Error al actualizar");

      setMsg(detailMsg, "✅ Actualizado correctamente.", "ok");
      setTimeout(() => {
        closeDetailModal();
        loadMyPlans();
      }, 800);
    } catch (err) {
      setMsg(detailMsg, err.message || "Error al guardar", "err");
    }
  });

  // === Funciones existentes (ajustadas) ===
  function openClose(id) {
    // Ya no se usa; ahora usamos openDetailModal
  }

  function closePanel() {
    $closeCard.classList.add("hidden");
  }

  async function reloadAll() {
    state.authed = false;
    state.area = "";
    state.solicitante = "";
    state.dni = "";
    $dni.value = "";
    $dni2.value = "";
    $dniRegister.classList.add("hidden");
    $area.value = "";
    fillSolicitantes();
    renderEmpty("Ingresa para ver tus registros.");
    setMsg($authMsg, "", "");
    await loadConfig();
  }

  // Init
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await loadConfig();
      fillSolicitantes();
      renderEmpty("Ingresa para ver tus registros.");
    } catch (e) {
      setMsg($authMsg, "Error cargando configuración.", "err");
    }

    $area.addEventListener("change", fillSolicitantes);
    document.getElementById("authForm").addEventListener("submit", handleAuthSubmit);
    $btnCancelClose.addEventListener("click", closePanel);
    $btnReload.addEventListener("click", reloadAll);
  });
})();
