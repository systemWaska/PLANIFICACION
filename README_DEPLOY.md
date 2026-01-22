# Planificación (Web + Apps Script)

## 1) Apps Script (Backend)
1. Crea un proyecto de Apps Script.
2. Pega el contenido de `apps_script/Code.gs`.
3. En **Project Settings → Script properties**, agrega:
   - `SPREADSHEET_ID` = (ID del Google Sheet)
   - (Opcional) `PLANNING_SHEET_NAME` = `BD PLANIFICACION`
   - (Opcional) `CONFIG_SHEET_NAME` = `Config`
   - (Opcional) `PLANNING_CALENDAR_ID` = ID del calendario

4. Implementa como Web App (**Deploy → New deployment**):
   - Execute as: **Me**
   - Who has access: **Anyone** (o según tu escenario interno)
5. Copia la URL /exec y pégala en `assets/config.js` (APPS_SCRIPT_WEBAPP_URL).

## 2) Config: columna DNI
En la hoja **Config** (BD_PERSONAL), agrega la columna **DNI** (8 dígitos).
- Si un usuario no tiene DNI, en `Cerrar` el sistema pedirá registrarlo.

## 3) Fecha proyectada (solo fecha)
En `Crear`, ahora se elige **Fecha proyectada** (sin hora).
- El backend guarda la hora por defecto en **10:00 a. m.** para Calendar y cálculos.

## 4) Cerrar planificación
Nueva página: `cerrar.html`
- Área → Usuario → DNI
- Lista “Pendiente/Pausado”
- Botón **Finalizar**: marca Estado=Finalizado, Ejecutado=fecha actual, y agrega actualización a Observación.

