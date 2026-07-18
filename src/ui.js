import { pressureFromAltitude, humidityRatio } from './psychrometrics.js';

// Zahl aus Eingabefeld lesen; Fallback nur bei ungültiger Eingabe (0 ist gültig)
function readNumber(input, fallback) {
  const value = parseFloat(input.value);
  return Number.isFinite(value) ? value : fallback;
}

// Wählbare Einheiten je Stromart; factor rechnet auf die SI-Basis (kg/s bzw. m³/s) um
const FLOW_UNITS = {
  mass: [
    { value: 'kg_h', label: 'kg/h', factor: 1 / 3600 },
    { value: 'kg_s', label: 'kg/s', factor: 1 },
  ],
  volume: [
    { value: 'm3_h', label: 'm³/h', factor: 1 / 3600 },
    { value: 'm3_s', label: 'm³/s', factor: 1 },
  ],
};

// Leistungen entlang der Prozesskette P1→P2→… berechnen.
// Q = ṁ·Δh (kW, h in kJ/kg trockene Luft), Wasserbilanz ṁ_W = ṁ·Δx.
// Bei Volumenstrom-Eingabe wird ṁ (trockene Luft) je Abschnitt aus der Dichte
// und Feuchte am Abschnittsanfang bestimmt: ṁ = V̇·ρ/(1 + x).
function computeSegmentPowers(points, flowType, flowSI) {
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const mDot = flowType === 'mass'
      ? flowSI
      : flowSI * p1.rho / (1 + p1.x / 1000);
    const dh = p2.h - p1.h;
    const dx = p2.x - p1.x;
    segments.push({
      from: p1.label,
      to: p2.label,
      dh,
      dx,
      Q: mDot * dh,               // kW
      waterFlow: mDot * dx * 3.6, // g/s → kg/h
    });
  }
  return segments;
}

export function setupUI(diagram) {
  const altitudeInput = document.getElementById('altitude');
  const tMinInput = document.getElementById('t-min');
  const tMaxInput = document.getElementById('t-max');
  const xMaxInput = document.getElementById('x-max');
  const showComfortCheckbox = document.getElementById('show-comfort');
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

  const flowType = document.getElementById('flow-type');
  const flowValue = document.getElementById('flow-value');
  const flowUnit = document.getElementById('flow-unit');
  const powerResults = document.getElementById('power-results');

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
      showComfort: showComfortCheckbox.checked,
    };
  }

  altitudeInput.addEventListener('input', updatePressureDisplay);

  // Behaglichkeitszonen sofort ein-/ausblenden (kein „Diagramm aktualisieren" nötig)
  showComfortCheckbox.addEventListener('change', () => {
    diagram.setShowComfort(showComfortCheckbox.checked);
  });

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
      pointsList.innerHTML = '<p class="empty-hint">Klicken Sie ins Diagramm oder nutzen Sie das Formular.</p>';
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
          ${p.fog ? '<span class="fog-tag">Nebelgebiet (übersättigt)</span>' : ''}
        </div>
      `;
      pointsList.appendChild(card);

      card.querySelector('.btn-remove').addEventListener('click', () => {
        diagram.removeStatePoint(p.id);
      });
    }
  }

  // --- Luftstrom & Leistung ---

  function populateFlowUnits() {
    flowUnit.innerHTML = '';
    for (const unit of FLOW_UNITS[flowType.value]) {
      const option = document.createElement('option');
      option.value = unit.value;
      option.textContent = unit.label;
      flowUnit.appendChild(option);
    }
  }

  function renderPowerResults(points) {
    const value = parseFloat(flowValue.value);
    if (!Number.isFinite(value) || value <= 0) {
      powerResults.innerHTML = '<p class="empty-hint">Luftstrom eingeben, um Leistungen zu berechnen.</p>';
      return;
    }
    if (points.length < 2) {
      powerResults.innerHTML = '<p class="empty-hint">Mindestens zwei Zustandspunkte setzen.</p>';
      return;
    }

    const unit = FLOW_UNITS[flowType.value].find(u => u.value === flowUnit.value)
      ?? FLOW_UNITS[flowType.value][0];
    const segments = computeSegmentPowers(points, flowType.value, value * unit.factor);

    powerResults.innerHTML = '';
    for (const s of segments) {
      const card = document.createElement('div');
      card.className = 'power-card';
      const qLabel = s.Q >= 0 ? 'Heizleistung' : 'Kühlleistung';
      const wLabel = s.waterFlow >= 0 ? 'Befeuchtung' : 'Entfeuchtung';
      card.innerHTML = `
        <div class="power-label">${s.from} → ${s.to}</div>
        <div class="power-values">
          <span>Δh = ${s.dh.toFixed(1)} kJ/kg</span>
          <span>Δx = ${s.dx.toFixed(2)} g/kg</span>
          <span>${qLabel}: ${Math.abs(s.Q).toFixed(2)} kW</span>
          <span>${wLabel}: ${Math.abs(s.waterFlow).toFixed(2)} kg/h</span>
        </div>
      `;
      powerResults.appendChild(card);
    }

    // Gesamtbilanz über die ganze Prozesskette
    if (segments.length > 1) {
      const totalQ = segments.reduce((sum, s) => sum + s.Q, 0);
      const totalW = segments.reduce((sum, s) => sum + s.waterFlow, 0);
      const card = document.createElement('div');
      card.className = 'power-card power-total';
      card.innerHTML = `
        <div class="power-label">Gesamt ${points[0].label} → ${points[points.length - 1].label}</div>
        <div class="power-values">
          <span>ΣQ = ${totalQ.toFixed(2)} kW</span>
          <span>ΣWasser = ${totalW.toFixed(2)} kg/h</span>
        </div>
      `;
      powerResults.appendChild(card);
    }
  }

  flowType.addEventListener('change', () => {
    populateFlowUnits();
    renderPowerResults(diagram.statePoints);
  });
  flowValue.addEventListener('input', () => renderPowerResults(diagram.statePoints));
  flowUnit.addEventListener('change', () => renderPowerResults(diagram.statePoints));

  diagram.callbacks.onPointsChanged = (points) => {
    renderPointsList(points);
    renderPowerResults(points);
  };
  diagram.callbacks.onPointAdded = () => {};

  updatePressureDisplay();
  populateFlowUnits();
  renderPointsList([]);
  renderPowerResults([]);
}
