// Configuración del Front (GitHub Pages)
window.APP_CONFIG = {
  // URL del Web App de Google Apps Script (Implementar -> Aplicación web)
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxRYj6GaB8O7q-reEmLTPuZsoDDNQo9Gp_MDlJaFTJ-MiCF5vZ5DRk7gptwDYjA85G4UQ/exec",
  // (Opcional) ID del Spreadsheet. Si está vacío, puedes pasar ?sid=... en la URL del sitio.
  SPREADSHEET_ID: ""
};

// Backward compatibility
const SCRIPT_URL = window.APP_CONFIG.SCRIPT_URL;
