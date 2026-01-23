window.onload = function() {
  loadConfig();
  document.getElementById('taskForm').addEventListener('submit', submitForm);
};

function loadConfig() {
  // Simula la carga de la configuración, que ahora puede venir desde un JSON o API
  const areas = ['Área 1', 'Área 2', 'Área 3']; // Cargar de config.js
  const solicitantes = ['Solicitante 1', 'Solicitante 2', 'Solicitante 3']; // Lo mismo para Solicitantes
  
  let areaSelect = document.getElementById("area");
  let solicitanteSelect = document.getElementById("solicitante");

  areas.forEach(area => {
    let option = document.createElement("option");
    option.value = area;
    option.innerHTML = area;
    areaSelect.appendChild(option);
  });

  solicitantes.forEach(solicitante => {
    let option = document.createElement("option");
    option.value = solicitante;
    option.innerHTML = solicitante;
    solicitanteSelect.appendChild(option);
  });
}

function submitForm(e) {
  e.preventDefault();
  let area = document.getElementById("area").value;
  let solicitante = document.getElementById("solicitante").value;
  let prioridad = document.getElementById("prioridad").value;
  let tiempo = document.getElementById("tiempo").value;
  let labores = document.getElementById("labores").value;
  let observacion = document.getElementById("observacion").value;

  // Se hace el post a la API
  fetch("https://script.google.com/macros/s/AKfycbxRYj6GaB8O7q-reEmLTPuZsoDDNQo9Gp_MDlJaFTJ-MiCF5vZ5DRk7gptwDYjA85G4UQ/exec", {
    method: 'POST',
    body: JSON.stringify({
      area: area,
      solicitante: solicitante,
      prioridad: prioridad,
      tiempoEstimado: tiempo,
      labores: labores,
      observacion: observacion
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(response => response.json())
    .then(data => {
      if (data.ok) {
        alert("Planificación creada exitosamente.");
        // Limpiar formulario
      } else {
        alert("Hubo un error.");
      }
    });
}
