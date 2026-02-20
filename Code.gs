/** PLANIFICACIÓN - Google Apps Script Web App (JSONP) v2
 * Acciones (GET/POST):
 * - action=config
 * - action=list
 * - action=summary
 * - action=create        (p={area, solicitante, email, prioridad, labores, tiempoEstimado, proyectadoDate, observacion})
 * - action=listMine      (p={area, usuario, dni})
 * - action=registerDni   (p={area, usuario, dni})
 * - action=registerEmail (p={area, usuario, email})
 * - action=getPlan       (p={id})
 * - action=close         (p={area, usuario, dni, id, nuevoEstado, note})
 */

function doGet(e)  { return handle_(e); }
function doPost(e) { return handle_(e); }

function handle_(e) {
  try {
    const action   = e?.parameter?.action   ? String(e.parameter.action)   : "config";
    const callback = e?.parameter?.callback ? String(e.parameter.callback) : null;
    const payload  = parsePayload_(e);
    let res;
    switch (action) {
      case "config":        res = actionConfig_(payload);        break;
      case "list":          res = actionList_(payload);          break;
      case "summary":       res = actionSummary_(payload);       break;
      case "create":        res = actionCreate_(payload);        break;
      case "listMine":      res = actionListMine_(payload);      break;
      case "registerDni":   res = actionRegisterDni_(payload);   break;
      case "registerEmail": res = actionRegisterEmail_(payload); break;
      case "getPlan":       res = actionGetPlan_(payload);       break;
      case "close":         res = actionClose_(payload);         break;
      default: res = { ok: false, error: "Acción no válida: " + action };
    }
    return output_(res, callback);
  } catch (err) {
    return output_({ ok: false, error: err?.message || String(err) }, e?.parameter?.callback ?? null);
  }
}

/* ──────────────────────────────────────────
   Payload / output helpers
   ────────────────────────────────────────── */

function parsePayload_(e) {
  const p   = e?.parameter?.p   ?? null;
  const sid = e?.parameter?.sid ?? null;
  let data  = {};
  if (p) { try { data = JSON.parse(base64urlDecode_(p)); } catch (_) {} }
  if (sid) data.sid = String(sid).trim();
  return data || {};
}

function base64urlDecode_(b64url) {
  let s = String(b64url).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Utilities.newBlob(Utilities.base64Decode(s)).getDataAsString("UTF-8");
}

function output_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* ──────────────────────────────────────────
   Spreadsheet helpers
   ────────────────────────────────────────── */

function getSpreadsheet_(sidOverride) {
  const props = PropertiesService.getScriptProperties();
  const sid   = (sidOverride && String(sidOverride).trim()) || props.getProperty("SPREADSHEET_ID");
  if (!sid) throw new Error("Falta Script Property SPREADSHEET_ID.");
  return SpreadsheetApp.openById(sid);
}

function getSheet_(ss, name, required) {
  const sh = ss.getSheetByName(name);
  if (!sh && required) throw new Error("No existe la hoja: " + name);
  return sh;
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const map = {};
  headers.forEach((h, i) => { map[h.trim()] = i + 1; });
  return map;
}

function getCol_(map, header) { return map[header] || null; }

function asDateAt10_(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt;
  }
  if (/^\d{2}\/\d{2}\/\d{4}(\s\d{2}:\d{2})?$/.test(value)) {
    const [datePart, timePart] = value.split(" ");
    const [d, m, y] = datePart.split("/").map(Number);
    const dt = new Date(y, m - 1, d, 10, 0, 0);
    if (timePart) { const [h, i] = timePart.split(":").map(Number); dt.setHours(h, i, 0, 0); }
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(value);
  if (isNaN(dt.getTime())) return null;
  if (dt.getHours() === 0 && dt.getMinutes() === 0) dt.setHours(10, 0, 0, 0);
  return dt;
}

function fmtDate_(d) {
  if (!d) return "";
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function fmtDateTime_(d) {
  if (!d) return "";
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
}

function now_() { return new Date(); }

/* ──────────────────────────────────────────
   Config sheet helper
   ────────────────────────────────────────── */

function findUserRow_(cfgSheet, area, usuario) {
  const rng     = cfgSheet.getDataRange().getValues();
  if (rng.length < 2) return null;
  const headers = rng[0].map(String);
  const iArea   = headers.indexOf("Area");
  const iUser   = headers.indexOf("Usuario");
  const iDni    = headers.indexOf("DNI");
  const iEmail  = headers.indexOf("Email");
  for (let r = 1; r < rng.length; r++) {
    const row = rng[r];
    if ((row[iArea] + "") === area && (row[iUser] + "") === usuario) {
      return { rowIndex: r + 1, headers, values: row, iDni, iEmail };
    }
  }
  return null;
}

/* ──────────────────────────────────────────
   Calendar helpers
   ────────────────────────────────────────── */

/**
 * Obtiene (o crea) un calendario para el área dada.
 * Primero busca en la hoja "Calendarios" (columnas: Area | CalendarId | CalendarName).
 * Si no existe, crea un nuevo calendario y lo guarda.
 */
function getOrCreateAreaCalendar_(ss, area) {
  const CAL_SHEET = PropertiesService.getScriptProperties().getProperty("CAL_SHEET") || "Calendarios";
  let calSh = ss.getSheetByName(CAL_SHEET);

  // Crear hoja si no existe
  if (!calSh) {
    calSh = ss.insertSheet(CAL_SHEET);
    calSh.appendRow(["Area", "CalendarId", "CalendarName"]);
  }

  const data = calSh.getDataRange().getValues();
  const hdr  = data[0].map(String);
  const iArea   = hdr.indexOf("Area");
  const iCalId  = hdr.indexOf("CalendarId");
  const iCalNm  = hdr.indexOf("CalendarName");

  // Buscar existente
  for (let r = 1; r < data.length; r++) {
    if ((data[r][iArea] + "").trim().toLowerCase() === area.trim().toLowerCase()) {
      const calId = (data[r][iCalId] + "").trim();
      if (calId) {
        try {
          const cal = CalendarApp.getCalendarById(calId);
          if (cal) return cal;
        } catch (_) {}
      }
    }
  }

  // Crear nuevo calendario para el área
  const calName = "Planificación - " + area;
  const newCal  = CalendarApp.createCalendar(calName, { color: CalendarApp.Color.CYAN });
  calSh.appendRow([area, newCal.getId(), calName]);
  return newCal;
}

/* ──────────────────────────────────────────
   ACTION: config
   ────────────────────────────────────────── */

function actionConfig_(p) {
  const ss      = getSpreadsheet_(p.sid);
  const cfgName = PropertiesService.getScriptProperties().getProperty("CONFIG_SHEET") || "Config";
  const sh      = getSheet_(ss, cfgName, true);

  const rng = sh.getDataRange().getValues();
  if (rng.length < 2) return { ok: true, config: { areas: [], usersByArea: {}, prioridades: [], estados: [] } };

  const headers  = rng[0].map(String);
  const idx      = (n) => headers.indexOf(n);
  const iArea    = idx("Area"),    iUsuario = idx("Usuario"), iEmail  = idx("Email");
  const iPrior   = idx("Prioridad"), iEstado  = idx("Estado"),  iOrden  = idx("Orden");
  const iDni     = idx("DNI");

  const areasSet = {}, prioridadesSet = {}, estadosSet = {}, usersByArea = {};

  for (let r = 1; r < rng.length; r++) {
    const row     = rng[r];
    const area    = (iArea    >= 0 ? row[iArea]    : "") + "";
    const usuario = (iUsuario >= 0 ? row[iUsuario] : "") + "";
    const email   = (iEmail   >= 0 ? row[iEmail]   : "") + "";
    const prior   = (iPrior   >= 0 ? row[iPrior]   : "") + "";
    const estado  = (iEstado  >= 0 ? row[iEstado]  : "") + "";
    const dni     = (iDni     >= 0 ? row[iDni]     : "") + "";
    const orden   = (iOrden   >= 0 ? row[iOrden]   : "") + "";

    if (area)    areasSet[area]      = true;
    if (prior)   prioridadesSet[prior] = true;
    if (estado)  estadosSet[estado]  = true;

    if (area && usuario) {
      if (!usersByArea[area]) usersByArea[area] = [];
      // hasEmail: true si el email está registrado
      usersByArea[area].push({ usuario, email, dni: !!dni, hasEmail: !!email.trim(), orden });
    }
  }

  Object.keys(usersByArea).forEach((a) => {
    usersByArea[a].sort((x, y) => {
      const ox = Number(x.orden || 999999), oy = Number(y.orden || 999999);
      return ox !== oy ? ox - oy : String(x.usuario).localeCompare(String(y.usuario));
    });
  });

  return {
    ok: true,
    config: {
      areas: Object.keys(areasSet).sort(),
      usersByArea,
      prioridades: Object.keys(prioridadesSet).sort(),
      estados: Object.keys(estadosSet).sort()
    }
  };
}

/* ──────────────────────────────────────────
   ACTION: list
   ────────────────────────────────────────── */

function actionList_(p) {
  const ss        = getSpreadsheet_(p.sid);
  const sheetName = PropertiesService.getScriptProperties().getProperty("PLAN_SHEET") || "BD PLANIFICACION";
  const sh        = getSheet_(ss, sheetName, true);

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: true, rows: [] };

  const headers = values[0].map(String);
  const idx     = (n) => headers.indexOf(n);

  const iId     = idx("ID"),        iArea   = idx("Area"),             iSol    = idx("Solicitante");
  const iPri    = idx("Prioridad"), iLab    = idx("Lista de labores"), iEstado = idx("Estado");
  const iTiempo = idx("Tiempo estimado"), iProy = idx("Proyectado"), iEjec = idx("Ejecutado");
  const iFecha  = idx("Fecha"),     iObs    = idx("Observacion");

  const wantArea    = (p.area       || "").trim();
  const wantSol     = (p.solicitante || "").trim();
  const wantEstados = Array.isArray(p.estados) ? p.estados.map(String) : null;
  const limit       = p.limit ? Math.min(Number(p.limit), 1000) : 500;

  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const obj = {
      id:            iId     >= 0 ? row[iId]     + "" : "",
      area:          iArea   >= 0 ? row[iArea]   + "" : "",
      solicitante:   iSol    >= 0 ? row[iSol]    + "" : "",
      prioridad:     iPri    >= 0 ? row[iPri]    + "" : "",
      labores:       iLab    >= 0 ? row[iLab]    + "" : "",
      estado:        iEstado >= 0 ? row[iEstado] + "" : "",
      tiempoEstimado:iTiempo >= 0 ? row[iTiempo] + "" : "",
      proyectado:    iProy   >= 0 ? fmtDate_(row[iProy])  : "",
      ejecutado:     iEjec   >= 0 ? fmtDate_(row[iEjec])  : "",
      fecha:         iFecha  >= 0 ? fmtDateTime_(row[iFecha]) : "",
      observacion:   iObs    >= 0 ? row[iObs]    + "" : ""
    };
    if (wantArea    && obj.area        !== wantArea)                                continue;
    if (wantSol     && obj.solicitante !== wantSol)                                 continue;
    if (wantEstados && wantEstados.length && !wantEstados.includes(obj.estado))     continue;
    rows.push(obj);
    if (rows.length >= limit) break;
  }
  return { ok: true, rows };
}

/* ──────────────────────────────────────────
   ACTION: summary
   ────────────────────────────────────────── */

function actionSummary_(p) {
  const ss        = getSpreadsheet_(p.sid);
  const sheetName = PropertiesService.getScriptProperties().getProperty("PLAN_SHEET") || "BD PLANIFICACION";
  const sh        = getSheet_(ss, sheetName, true);

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: true, summary: { pendiente:0, finalizado:0, porVencer48:0, vencidos:0, total:0, recent:[] } };

  const headers = values[0].map(String);
  const idx     = (n) => headers.indexOf(n);
  const iId     = idx("ID"), iArea = idx("Area"), iSol = idx("Solicitante");
  const iEstado = idx("Estado"), iProy = idx("Proyectado"), iFecha = idx("Fecha");

  const now  = now_();
  const in48 = new Date(now.getTime() + 48 * 3600 * 1000);
  let pendiente = 0, finalizado = 0, porVencer48 = 0, vencidos = 0, total = 0;
  const recent = [];

  for (let r = values.length - 1; r >= 1; r--) {
    const row    = values[r];
    const estado = (iEstado >= 0 ? row[iEstado] : "") + "";
    const proy   = iProy >= 0 ? row[iProy] : null;
    const isDone = /finaliz|conclu/i.test(estado);
    total++;
    if (isDone) finalizado++;
    else if (/pendiente/i.test(estado)) pendiente++;
    if (!isDone && proy instanceof Date) {
      if (proy <= now) vencidos++;
      else if (proy <= in48) porVencer48++;
    }
    if (recent.length < 6) {
      recent.push({
        id: iId >= 0 ? row[iId] + "" : "",
        area: iArea >= 0 ? row[iArea] + "" : "",
        solicitante: iSol >= 0 ? row[iSol] + "" : "",
        estado,
        fecha: iFecha >= 0 ? fmtDate_(row[iFecha]) : ""
      });
    }
  }
  return { ok: true, summary: { pendiente, finalizado, porVencer48, vencidos, total, recent } };
}

/* ──────────────────────────────────────────
   ACTION: create
   ────────────────────────────────────────── */

function actionCreate_(p) {
  ["area", "solicitante", "prioridad", "labores", "proyectadoDate"].forEach((k) => {
    if (!p[k]) throw new Error("Falta campo: " + k);
  });

  const ss        = getSpreadsheet_(p.sid);
  const sheetName = PropertiesService.getScriptProperties().getProperty("PLAN_SHEET") || "BD PLANIFICACION";
  const sh        = getSheet_(ss, sheetName, true);
  const map       = getHeaderMap_(sh);
  const colId     = getCol_(map, "ID") || 1;

  // next id
  const lastRow = sh.getLastRow();
  let nextNum = 1;
  if (lastRow >= 2) {
    sh.getRange(2, colId, lastRow - 1, 1).getValues().flat().map(String).forEach((v) => {
      const m = v.match(/(\d+)/);
      if (m) nextNum = Math.max(nextNum, Number(m[1]) + 1);
    });
  }
  const newId = "PLAN-" + ("000" + nextNum).slice(-3);

  const row = [];
  for (let c = 1; c <= sh.getLastColumn(); c++) row.push("");

  function set(h, val) { const col = getCol_(map, h); if (col) row[col - 1] = val; }

  set("ID",               newId);
  set("Area",             p.area);
  set("Solicitante",      p.solicitante);
  set("Prioridad",        p.prioridad);
  set("Lista de labores", p.labores);
  set("Estado",           "Pendiente");
  set("Tiempo estimado",  p.tiempoEstimado || "");
  set("Proyectado",       asDateAt10_(p.proyectadoDate));
  set("Fecha",            now_());
  set("Observacion",      p.observacion || "");

  // Si el email viene en el payload pero no está en Config, guardarlo
  if (p.email && p.email.trim()) {
    _saveEmailIfMissing_(ss, p.area, p.solicitante, p.email.trim());
  }

  // Calendar: usar calendario del área
  try {
    const cal   = getOrCreateAreaCalendar_(ss, p.area);
    const start = asDateAt10_(p.proyectadoDate);
    if (cal && start) {
      const end   = new Date(start.getTime() + 30 * 60000);
      const title = newId + " · " + p.solicitante;
      const desc  = (p.labores || "") + (p.observacion ? "\n\n" + p.observacion : "");
      const ev    = cal.createEvent(title, start, end, { description: desc, guests: p.email || "" });
      set("CalendarEventId", ev.getId());
    }
  } catch (_) {}

  sh.appendRow(row);
  return { ok: true, id: newId };
}

/** Guarda el email en Config si la columna Email está vacía para ese usuario */
function _saveEmailIfMissing_(ss, area, usuario, email) {
  try {
    const cfgName = PropertiesService.getScriptProperties().getProperty("CONFIG_SHEET") || "Config";
    const cfg     = getSheet_(ss, cfgName, false);
    if (!cfg) return;
    const u = findUserRow_(cfg, area, usuario);
    if (!u) return;
    if (u.iEmail < 0) return;
    const current = (u.values[u.iEmail] + "").trim();
    if (!current) cfg.getRange(u.rowIndex, u.iEmail + 1).setValue(email);
  } catch (_) {}
}

/* ──────────────────────────────────────────
   ACTION: registerEmail
   ────────────────────────────────────────── */

function actionRegisterEmail_(p) {
  if (!p.area || !p.usuario || !p.email) throw new Error("Falta área/usuario/email.");
  const email = String(p.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email no válido.");

  const ss      = getSpreadsheet_(p.sid);
  const cfgName = PropertiesService.getScriptProperties().getProperty("CONFIG_SHEET") || "Config";
  const cfg     = getSheet_(ss, cfgName, true);
  const u       = findUserRow_(cfg, String(p.area).trim(), String(p.usuario).trim());
  if (!u) throw new Error("Usuario no encontrado en Config.");
  if (u.iEmail < 0) throw new Error("No existe columna Email en Config.");

  cfg.getRange(u.rowIndex, u.iEmail + 1).setValue(email);

  // Intentar agregar al calendario del área
  try {
    const cal = getOrCreateAreaCalendar_(ss, p.area);
    if (cal) cal.addGuest(email);
  } catch (_) {}

  return { ok: true };
}

/* ──────────────────────────────────────────
   ACTION: listMine
   ────────────────────────────────────────── */

function actionListMine_(p) {
  if (!p.area || !p.usuario || !p.dni) throw new Error("Falta área/usuario/dni.");
  const area    = String(p.area).trim();
  const usuario = String(p.usuario).trim();
  const dni     = String(p.dni).trim();

  const ss      = getSpreadsheet_(p.sid);
  const cfgName = PropertiesService.getScriptProperties().getProperty("CONFIG_SHEET") || "Config";
  const cfg     = getSheet_(ss, cfgName, true);
  const u       = findUserRow_(cfg, area, usuario);
  if (!u) throw new Error("Usuario no encontrado en Config.");

  const currentDni = (u.iDni >= 0 ? (u.values[u.iDni] + "").trim() : "");
  if (!currentDni) return { ok: true, requireRegisterDni: true };
  if (currentDni !== dni) throw new Error("DNI/contraseña incorrecta.");

  // Verificar si tiene email
  const currentEmail = (u.iEmail >= 0 ? (u.values[u.iEmail] + "").trim() : "");

  // Traer TODAS las planificaciones del usuario (todos los estados)
  const all = actionList_({ sid: p.sid, area, solicitante: usuario, limit: 500 });
  return { ok: true, rows: all.rows || [], hasEmail: !!currentEmail };
}

/* ──────────────────────────────────────────
   ACTION: registerDni
   ────────────────────────────────────────── */

function actionRegisterDni_(p) {
  if (!p.area || !p.usuario || !p.dni) throw new Error("Falta área/usuario/dni.");
  const dni = String(p.dni).trim();
  if (!/^\d{8}$/.test(dni)) throw new Error("DNI debe tener 8 dígitos.");

  const ss      = getSpreadsheet_(p.sid);
  const cfgName = PropertiesService.getScriptProperties().getProperty("CONFIG_SHEET") || "Config";
  const cfg     = getSheet_(ss, cfgName, true);
  const u       = findUserRow_(cfg, String(p.area).trim(), String(p.usuario).trim());
  if (!u) throw new Error("Usuario no encontrado en Config.");
  if (u.iDni < 0) throw new Error("No existe columna DNI en Config. Créala con encabezado: DNI");

  cfg.getRange(u.rowIndex, u.iDni + 1).setValue(dni);
  return { ok: true };
}

/* ──────────────────────────────────────────
   ACTION: getPlan
   ────────────────────────────────────────── */

function actionGetPlan_(p) {
  if (!p.id) throw new Error("Falta ID");
  const ss        = getSpreadsheet_(p.sid);
  const sheetName = PropertiesService.getScriptProperties().getProperty("PLAN_SHEET") || "BD PLANIFICACION";
  const sh        = getSheet_(ss, sheetName, true);
  const values    = sh.getDataRange().getValues();
  const headers   = values[0].map(String);
  const idx       = (n) => headers.indexOf(n);

  for (let r = 1; r < values.length; r++) {
    if (values[r][idx("ID")] == p.id) {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[r][i]; });
      return { ok: true, plan: obj };
    }
  }
  return { ok: false, error: "Plan no encontrado" };
}

/* ──────────────────────────────────────────
   ACTION: close
   ────────────────────────────────────────── */

function actionClose_(p) {
  const area       = String(p.area       || "").trim();
  const usuario    = String(p.usuario    || "").trim();
  const dni        = String(p.dni        || "").trim();
  const id         = String(p.id         || "").trim();
  const nuevoEstado= String(p.nuevoEstado|| "").trim();
  const note       = String(p.note       || "").trim();

  if (!area || !usuario || !dni || !id || !nuevoEstado) throw new Error("Faltan datos para cerrar.");
  if (!note) throw new Error("La actualización es obligatoria.");

  const ss      = getSpreadsheet_(p.sid);
  const cfgName = PropertiesService.getScriptProperties().getProperty("CONFIG_SHEET") || "Config";
  const cfg     = getSheet_(ss, cfgName, true);
  const u       = findUserRow_(cfg, area, usuario);
  if (!u) throw new Error("Usuario no encontrado en Config.");

  const currentDni = (u.iDni >= 0 ? (u.values[u.iDni] + "").trim() : "");
  if (!currentDni) return { ok: false, error: "DNI no registrado." };
  if (currentDni !== dni) throw new Error("DNI/contraseña incorrecta.");

  const planName = PropertiesService.getScriptProperties().getProperty("PLAN_SHEET") || "BD PLANIFICACION";
  const sh       = getSheet_(ss, planName, true);
  const map      = getHeaderMap_(sh);

  const colId    = getCol_(map, "ID") || 1;
  const colEstado= getCol_(map, "Estado");
  const colEjec  = getCol_(map, "Ejecutado");
  const colObs   = getCol_(map, "Observacion");
  const colCalId = getCol_(map, "CalendarEventId");

  const lastRow = sh.getLastRow();
  const ids     = sh.getRange(2, colId, Math.max(lastRow - 1, 0), 1).getValues();
  let rowIndex  = -1;
  for (let i = 0; i < ids.length; i++) {
    if ((ids[i][0] + "") === id) { rowIndex = i + 2; break; }
  }
  if (rowIndex < 0) throw new Error("No se encontró el ID: " + id);

  if (colEstado) sh.getRange(rowIndex, colEstado).setValue(nuevoEstado);
  if (colEjec)   sh.getRange(rowIndex, colEjec).setValue(now_());

  if (colObs) {
    const old   = (sh.getRange(rowIndex, colObs).getValue() + "").trim();
    const stamp = fmtDate_(now_());
    const line  = "[" + stamp + "] " + usuario + ": " + note;
    sh.getRange(rowIndex, colObs).setValue(old ? (old + "\n" + line) : line);
  }

  // Eliminar del calendario si es Finalizado/Anulado
  if (/finaliz|anulad/i.test(nuevoEstado) && colCalId) {
    try {
      const evId    = (sh.getRange(rowIndex, colCalId).getValue() + "").trim();
      if (evId) {
        // Buscar en todos los calendarios del área (o el global)
        const allCals = CalendarApp.getAllCalendars();
        for (const cal of allCals) {
          const ev = cal.getEventById(evId);
          if (ev) { ev.deleteEvent(); break; }
        }
      }
    } catch (_) {}
  }

  return { ok: true };
}
