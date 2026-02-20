/* ============================================================
   cerrar.js — Actualizar / Cerrar planificaciones  v2
   ============================================================ */
(() => {
  /* ── Elementos DOM ── */
  const $area        = document.getElementById("area");
  const $sol         = document.getElementById("solicitante");
  const $dni         = document.getElementById("dni");
  const $dni2        = document.getElementById("dni2");
  const $dniRegister = document.getElementById("dniRegister");
  const $authMsg     = document.getElementById("authMsg");
  const $btnReload   = document.getElementById("btnReload");
  const $tbody       = document.getElementById("tbody");
  const $filterEstado= document.getElementById("filterEstado");
  const $btnCancelClose = document.getElementById("btnCancelClose");

  /* Modal de detalle */
  const detailModal      = document.getElementById("detailModal");
  const detailTitle      = document.getElementById("detailTitle");
  const detailContent    = document.getElementById("detailContent");
  const detailForm       = document.getElementById("detailForm");
  const detailObservacion= document.getElementById("detailObservacion");
  const detailEstado     = document.getElementById("detailEstado");
  const detailMsg        = document.getElementById("detailMsg");
  const btnCancelDetail  = document.getElementById("btnCancelDetail");

  /* Modal de registro de email */
  const emailModal   = document.getElementById("emailModal");
  const $emailInput  = document.getElementById("emailInput");
  const emailForm    = document.getElementById("emailForm");
  const emailMsg     = document.getElementById("emailMsg");
  const btnSkipEmail = document.getElementById("btnSkipEmail");

  /* Estado global */
  const state = {
    cfg: null, authed: false,
    area: "", solicitante: "", dni: "",
    allRows: [],
    hasEmail: false
  };

  /* ── Helpers ── */
  function setMsg(el, text, type) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("ok", "warn", "err");
    if (type) el.classList.add(type);
  }

  function isValidDni(v) { return /^\d{8}$/.test(String(v || "").trim()); }

  function fmtDateOnly(v) {
    if (!v) return "";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) return v.substring(0, 10);
    const dt = new Date(v);
    if (isNaN(dt.getTime())) return String(v);
    return dt.toLocaleDateString("es-PE");
  }

  function estadoClass(estado) {
    const s = String(estado || "").toLowerCase();
    if (/finaliz|conclu/.test(s)) return "badge-ok";
    if (/pendiente/.test(s))      return "badge-warn";
    if (/paus|suspend/.test(s))   return "badge-info";
    if (/anul|cancel/.test(s))    return "badge-bad";
    return "";
  }

  function isPending(estado) { return /pendiente|pausado/i.test(estado); }

  /* ── Config ── */
  async function loadConfig() {
    setMsg($authMsg, "Cargando configuración...", "warn");
    const res = await API.get("config");
    const cfg = res && res.config ? res.config : res;
    state.cfg = cfg;
    $area.innerHTML = '<option value="">Selecciona un área</option>';
    (cfg.areas || []).forEach(a => {
      const opt = document.createElement("option");
      opt.value = a; opt.textContent = a;
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
    (state.cfg.usersByArea && state.cfg.usersByArea[area] || []).forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.usuario; opt.textContent = u.usuario;
      $sol.appendChild(opt);
    });
  }

  /* ── Auth flow ── */
  async function handleAuthSubmit(e) {
    e.preventDefault();
    const area = $area.value, sol = $sol.value, dni = $dni.value.trim();
    if (!area || !sol) return setMsg($authMsg, "Selecciona Área y Usuario.", "err");
    if (!isValidDni(dni)) return setMsg($authMsg, "La contraseña (DNI) debe tener 8 dígitos.", "err");

    if (!$dniRegister.classList.contains("hidden")) {
      const ok = await doRegisterDni(area, sol, dni);
      if (!ok) return;
    }

    setMsg($authMsg, "Validando...", "warn");
    let res;
    try { res = await API.get("listMine", { area, usuario: sol, dni }); }
    catch (_) { return setMsg($authMsg, "Error de conexión.", "err"); }

    if (res && res.requireRegisterDni) {
      $dniRegister.classList.remove("hidden");
      return setMsg($authMsg,
        "⚠️ Este usuario no tiene contraseña registrada. Ingresa tu DNI (8 dígitos) dos veces para registrarlo.",
        "warn");
    }
    if (!res || res.ok !== true) {
      return setMsg($authMsg, (res && (res.error || res.message)) || "No se pudo validar.", "err");
    }

    $dniRegister.classList.add("hidden");
    state.authed = true; state.area = area; state.solicitante = sol; state.dni = dni;
    state.hasEmail = res.hasEmail || false;
    setMsg($authMsg, "✅ Acceso correcto.", "ok");
    state.allRows = res.rows || [];
    renderTable();
    if (!state.hasEmail) showEmailModal();
  }

  async function doRegisterDni(area, sol, dni) {
    const dni2 = ($dni2 && $dni2.value || "").trim();
    if (!isValidDni(dni) || !isValidDni(dni2)) {
      setMsg($authMsg, "Ambos campos deben tener 8 dígitos.", "err"); return false;
    }
    if (dni !== dni2) { setMsg($authMsg, "Los DNI no coinciden.", "err"); return false; }
    setMsg($authMsg, "Registrando contraseña...", "warn");
    try {
      const res = await API.get("registerDni", { area, usuario: sol, dni });
      if (!res || res.ok !== true) { setMsg($authMsg, (res && res.error) || "No se pudo registrar.", "err"); return false; }
      $dniRegister.classList.add("hidden");
      return true;
    } catch (_) { setMsg($authMsg, "Error al registrar.", "err"); return false; }
  }

  /* ── Tabla ── */
  function renderTable() {
    const filter = ($filterEstado && $filterEstado.value) || "active";
    let rows = state.allRows;
    if (filter === "active") rows = rows.filter(r => isPending(r.estado));
    else if (filter === "done") rows = rows.filter(r => !isPending(r.estado));

    if (!rows.length) {
      const msg = filter === "active"
        ? "No tienes planificaciones activas. 🎉"
        : "Sin registros en este filtro.";
      $tbody.innerHTML = `<tr><td colspan="6" class="muted">${msg}</td></tr>`;
      return;
    }

    $tbody.innerHTML = "";
    rows.forEach(r => {
      const isPend = isPending(r.estado);
      const labShort = (r.labores || "").length > 45
        ? (r.labores || "").substring(0, 45) + "…" : (r.labores || "");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${esc(r.id)}</b></td>
        <td class="truncate" title="${esc(r.labores)}">${esc(labShort)}</td>
        <td><span class="badge ${estadoClass(r.estado)}">${esc(r.estado)}</span></td>
        <td>${esc(r.prioridad)}</td>
        <td>${esc(fmtDateOnly(r.proyectado))}</td>
        <td><button class="btn small${isPend?' primary':''}" data-id="${esc(r.id)}" data-action="detail">
          ${isPend ? "✏️ Actualizar" : "👁 Ver"}
        </button></td>
      `;
      $tbody.appendChild(tr);
    });
    $tbody.querySelectorAll("[data-action='detail']").forEach(btn => {
      btn.addEventListener("click", () => {
        const plan = state.allRows.find(r => r.id === btn.dataset.id);
        if (plan) openDetailModal(plan);
      });
    });
  }

  function esc(s) { return UI ? UI.escapeHtml(s || "") : String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  /* ── Modal detalle ── */
  function openDetailModal(plan) {
    setMsg(detailMsg, "", "");
    if (detailObservacion) detailObservacion.value = "";
    if (detailEstado) detailEstado.value = "Finalizado";

    const isPend = isPending(plan.estado);
    detailTitle.textContent = `Planificación ${plan.id}`;

    detailContent.innerHTML = `
      <div class="modal-kv"><span>Área:</span> <b>${esc(plan.area)}</b></div>
      <div class="modal-kv"><span>Prioridad:</span> <b>${esc(plan.prioridad)}</b></div>
      <div class="modal-kv"><span>Estado:</span> <b class="badge ${estadoClass(plan.estado)}">${esc(plan.estado)}</b></div>
      <div class="modal-kv"><span>Proyectado:</span> <b>${esc(fmtDateOnly(plan.proyectado))}</b></div>
      ${plan.ejecutado ? `<div class="modal-kv"><span>Ejecutado:</span> <b>${esc(fmtDateOnly(plan.ejecutado))}</b></div>` : ""}
      <div class="modal-kv"><span>Registrado:</span> <b>${esc(plan.fecha)}</b></div>
      <div class="modal-section-label">📋 Labores</div>
      <div class="obs-box">${esc(plan.labores || "Sin descripción")}</div>
      ${plan.observacion ? `
        <div class="modal-section-label">📝 Historial de observaciones</div>
        <div class="obs-box obs-history">${esc(plan.observacion)}</div>` : ""}
    `;

    const formSection = document.getElementById("detailFormSection");
    const readonlyNote= document.getElementById("detailReadonlyNote");
    if (formSection) formSection.style.display = isPend ? "" : "none";
    if (readonlyNote) readonlyNote.style.display = isPend ? "none" : "";
    if (detailForm) detailForm.dataset.planId = plan.id;
    detailModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeDetailModal() {
    detailModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  btnCancelDetail && btnCancelDetail.addEventListener("click", closeDetailModal);
  detailModal && detailModal.addEventListener("click", e => { if (e.target === detailModal) closeDetailModal(); });

  detailForm && detailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id  = detailForm.dataset.planId;
    const obs = detailObservacion && detailObservacion.value.trim();
    const nuevoEstado = detailEstado && detailEstado.value;
    if (!obs) return setMsg(detailMsg, "La nota/actualización es obligatoria.", "err");
    setMsg(detailMsg, "Guardando...", "warn");
    try {
      const res = await API.get("close", { id, area: state.area, usuario: state.solicitante, dni: state.dni, nuevoEstado, note: obs });
      if (!res || !res.ok) throw new Error((res && res.error) || "Error al actualizar");
      setMsg(detailMsg, "✅ Actualizado correctamente.", "ok");
      const idx = state.allRows.findIndex(r => r.id === id);
      if (idx >= 0) {
        state.allRows[idx].estado = nuevoEstado;
        const today = new Date().toLocaleDateString("es-PE");
        const line  = "[" + today + "] " + state.solicitante + ": " + obs;
        state.allRows[idx].observacion = state.allRows[idx].observacion
          ? state.allRows[idx].observacion + "\n" + line : line;
      }
      setTimeout(() => { closeDetailModal(); renderTable(); }, 700);
    } catch (err) { setMsg(detailMsg, err.message || "Error al guardar", "err"); }
  });

  /* ── Modal email ── */
  function showEmailModal() {
    if (!emailModal) return;
    if ($emailInput) $emailInput.value = "";
    setMsg(emailMsg, "", "");
    emailModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeEmailModal() {
    if (!emailModal) return;
    emailModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  btnSkipEmail && btnSkipEmail.addEventListener("click", closeEmailModal);
  emailModal   && emailModal.addEventListener("click", e => { if (e.target === emailModal) closeEmailModal(); });

  emailForm && emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $emailInput && $emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setMsg(emailMsg, "Ingresa un correo válido.", "err");
    setMsg(emailMsg, "Registrando correo...", "warn");
    try {
      const res = await API.get("registerEmail", { area: state.area, usuario: state.solicitante, email });
      if (!res || !res.ok) throw new Error((res && res.error) || "Error");
      setMsg(emailMsg, "✅ Correo registrado. Serás agregado al calendario del área.", "ok");
      state.hasEmail = true;
      setTimeout(closeEmailModal, 2000);
    } catch (err) { setMsg(emailMsg, err.message || "Error", "err"); }
  });

  /* ── Reload ── */
  async function reloadAll() {
    Object.assign(state, { authed: false, area: "", solicitante: "", dni: "", allRows: [], hasEmail: false });
    $dni.value = "";
    if ($dni2) $dni2.value = "";
    $dniRegister.classList.add("hidden");
    $area.value = ""; fillSolicitantes();
    $tbody.innerHTML = `<tr><td colspan="6" class="muted">Ingresa para ver tus registros.</td></tr>`;
    setMsg($authMsg, "", "");
    await loadConfig();
  }

  /* ── Init ── */
  document.addEventListener("DOMContentLoaded", async () => {
    try { await loadConfig(); } catch (_) { setMsg($authMsg, "Error cargando configuración.", "err"); }
    fillSolicitantes();
    $tbody.innerHTML = `<tr><td colspan="6" class="muted">Ingresa para ver tus registros.</td></tr>`;
    $area.addEventListener("change", fillSolicitantes);
    document.getElementById("authForm") && document.getElementById("authForm").addEventListener("submit", handleAuthSubmit);
    $btnReload && $btnReload.addEventListener("click", reloadAll);
    $filterEstado && $filterEstado.addEventListener("change", renderTable);
  });
})();
