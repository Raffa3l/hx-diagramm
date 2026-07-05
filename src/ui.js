import { pressureFromAltitude, humidityRatio } from './psychrometrics.js';

// Zahl aus Eingabefeld lesen; Fallback nur bei ungültiger Eingabe (0 ist gültig)
function readNumber(input, fallback) {
  const value = parseFloat(input.value);
  return Number.isFinite(value) ? value : fallback;
}

export function setupUI(diagram) {
  const altitudeInput = document.getElementById('altitude');
  const tMinInput = document.getElementById('t-min');
  const tMaxInput = document.getElementById('t-max');
  const xMaxInput = document.getElementById('x-max');
  const pressureDisplay = document.getElementById('pressure-display');
  const btnUpdateConfig = document.getElementById('btn-update-config');

  const inputMode = document.getElementById('input-mode');
  const inputT = document.getElementById('input-t');
  const inputPhi = document.getElementById('input-phi');
  const inputX = document.getElementById('input-x');
  const phiGroup = document.getElementById('phi-input-group');
  const xGroup = document.getElementById('x-input-group');
  const btnAddPoint = document.getElementById('btn-add-point');

  const pointsList = document.getElementById('points-list');
  const btnClearPoints = document.getElementById('btn-clear-points');

  function updatePressureDisplay() {
    const alt = readNumber(altitudeInput, 500);
    const p = pressureFromAltitude(alt);
    pressureDisplay.textContent = `≈ ${(p / 100).toFixed(0)} mbar`;
  }

  function getConfig() {
    const altitude = readNumber(altitudeInput, 500);
    const tMin = readNumber(tMinInput, -10);
    let tMax = readNumber(tMaxInput, 50);
    if (tMax <= tMin) tMax = tMin + 10;
    return {
      altitude,
      pressure: pressureFromAltitude(altitude),
      tMin,
      tMax,
      xMax: Math.max(1, readNumber(xMaxInput, 30)),
    };
  }

  altitudeInput.addEventListener('input', updatePressureDisplay);

  btnUpdateConfig.addEventListener('click', () => {
    const config = getConfig();
    diagram.update(config);
  });

  inputMode.addEventListener('change', () => {
    if (inputMode.value === 'phi') {
      phiGroup.classList.remove('hidden');
      xGroup.classList.add('hidden');
    } else {
      phiGroup.classList.add('hidden');
      xGroup.classList.remove('hidden');
    }
  });

  btnAddPoint.addEventListener('click', () => {
    const T = parseFloat(inputT.value);
    if (isNaN(T)) return;

    const config = getConfig();
    let x_gkg;

    if (inputMode.value === 'phi') {
      const phi = parseFloat(inputPhi.value) / 100;
      if (isNaN(phi) || phi < 0 || phi > 1) return;
      x_gkg = humidityRatio(T, phi, config.pressure) * 1000;
      if (!Number.isFinite(x_gkg)) return;
    } else {
      x_gkg = parseFloat(inputX.value);
      if (isNaN(x_gkg) || x_gkg < 0) return;
    }

    diagram.addStatePoint(T, x_gkg);
  });

  btnClearPoints.addEventListener('click', () => {
    diagram.clearStatePoints();
    renderPointsList([]);
  });

  function renderPointsList(points) {
    pointsList.innerHTML = '';
    if (points.length === 0) {
      pointsList.innerHTML = '<p style="font-size:0.78rem;color:#9ca3af;">Klicken Sie ins Diagramm oder nutzen Sie das Formular.</p>';
      return;
    }

    for (const p of points) {
      const card = document.createElement('div');
      card.className = 'point-card';
      card.innerHTML = `
        <div class="point-label">${p.label}</div>
        <button class="btn-remove" data-id="${p.id}" title="Entfernen">×</button>
        <div class="point-values">
          <span>T = ${p.T.toFixed(1)} °C</span>
          <span>φ = ${(p.phi * 100).toFixed(1)} %</span>
          <span>x = ${p.x.toFixed(2)} g/kg</span>
          <span>h = ${p.h.toFixed(1)} kJ/kg</span>
          <span>T<sub>d</sub> = ${p.Td.toFixed(1)} °C</span>
          <span>ρ = ${p.rho.toFixed(3)} kg/m³</span>
        </div>
      `;
      pointsList.appendChild(card);

      card.querySelector('.btn-remove').addEventListener('click', () => {
        diagram.removeStatePoint(p.id);
      });
    }
  }

  diagram.callbacks.onPointsChanged = renderPointsList;
  diagram.callbacks.onPointAdded = () => {};

  updatePressureDisplay();
  renderPointsList([]);
}
