# Integración con Google Calendar (Calendario Compartido)

Esta versión crea un **evento en un calendario compartido** cada vez que registras una planificación.

## 1) Preparar tu hoja `Config`
En la hoja **Config** (BD_PERSONAL), asegúrate de tener estas columnas (mínimo):

- **Area**
- **Usuario** (o Solicitante)
- **Email** (NUEVA)

Ejemplo:

| Area | Usuario | Email |
|---|---|---|
| ADMINISTRACION | CUCHILLO PEREZ ANGEL EDUARDO | logwaska@gmail.com |
| ADMINISTRACION | OTRO USUARIO | logwaska@gmail.com |
| MARKETING | ALGUIEN | asistenciawaska@gmail.com |

✅ *Varios usuarios pueden repetir el mismo correo.*

## 2) Crear/usar un calendario compartido
1. En Google Calendar (cuenta dueña del script), crea un calendario nuevo: por ejemplo **Planificación Waska**.
2. Ve a **Configuración y uso compartido** del calendario.
3. En **Integrar calendario**, copia el **ID del calendario** (termina en `@group.calendar.google.com`).
4. En **Compartir con personas y grupos**, agrega los 2 correos que usarás y dales permiso para ver/editar según lo que necesites.

## 3) Configurar el ID del calendario en Apps Script
Opción recomendada (sin tocar código):

1. Abre el proyecto de Apps Script.
2. Ve a **Configuración del proyecto**.
3. En **Propiedades de secuencia de comandos (Script properties)** agrega:

- **Nombre**: `PLANNING_CALENDAR_ID`
- **Valor**: pega el ID del calendario compartido.

> Si no configuras esta propiedad, el código usa el valor de respaldo definido en `SETTINGS.DEFAULT_CALENDAR_ID`.

## 4) Permisos / autorización
La primera vez que uses “Crear planificación”, el script pedirá permisos para:
- Leer y escribir en Sheets
- Crear eventos en Calendar

**Acepta** y vuelve a probar.

## 5) ¿Cómo llega la alerta al usuario?
- El evento se crea en el **calendario compartido**.
- El usuario recibe notificación **si**:
  - El usuario tiene ese calendario en su lista (al compartirlo, normalmente aparece), y
  - Tiene activadas notificaciones / recordatorios en Google Calendar.

Además, el script:
- Agrega recordatorios emergentes (por defecto 60 min y 10 min antes).
- Invita como "guests" al/los correos de la columna **Email** (si existe).

## 6) Notas importantes
- Este flujo funciona mejor con un **calendario compartido**, porque el script no puede “escribir” directamente en el calendario personal de otra cuenta sin OAuth por usuario.
- Si quieres que se cree en el **calendario personal de cada usuario**, necesitas un sistema de login OAuth por usuario (más complejo).
