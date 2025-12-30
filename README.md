# Planificación (Front GitHub Pages + Back Apps Script)

## 1) Front (GitHub Pages)
Sube esta carpeta a tu repositorio y habilita **Settings → Pages** (branch main / root).

### Cambiar URL del WebApp
Edita SOLO:
- `assets/config.js`

## 2) Back (Apps Script)
En tu Google Sheet:
- Hoja **BD PLANIFICACION**
- Hoja **Config** con columnas:
  - Area | Solicitante

En Apps Script:
- Pega el contenido de `Code.gs`
- Implementar → Nueva implementación → Tipo: Aplicación web
- Acceso: Cualquiera
- Copia la URL del Web App y pégala en `assets/config.js`

## 3) Tiempo estimado
Formato: `H` horas, `D` días, `S` semanas, `M` meses (aprox. 30 días)
Ejemplos:
- 5H
- 3D
- 1S
- 1M
