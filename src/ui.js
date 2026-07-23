import { pressureFromAltitude, humidityRatio } from './psychrometrics.js';

// Zahl aus Eingabefeld lesen; Fallback nur bei ungültiger Eingabe (0 ist gültig)
function readNumber(input, fallback) {
  const value = parseFloat(input.value);
  return Number.isFinite(value) ? value : fallback;
}

// Wert lesen und auf die min/max-Attribute des Feldes klemmen (die Attribute
// greifen bei getippten Werten nicht). Bei Begrenzung wird eine Meldung
// gesammelt und der Wert optional ins Feld zurückgeschrieben.
function readClamped(input, fallback, label, unit, messages, writeBack) {
  const raw = readNumber(input, fallback);
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  let value = raw;
  if (Number.isFinite(min)) value = Math.max(min, value);
  if (Number.isFinite(max)) value = Math.min(max, value);
  if (value !== raw) {
    messages.push(`${label} auf ${value} ${unit} begrenzt (zulässig ${min} bis ${max} ${unit}).`);
    if (writeBack) input.value = value;
  }
  return value;
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
  const showSultrinessCheckbox = document.getElementById('show-sultriness');
  const showPmvCheckbox = document.getElementById('show-pmv');
  const pmvCloInput = document.getElementById('pmv-clo');
  const pmvMetInput = document.getElementById('pmv-met');
  const pmvVelInput = document.getElementById('pmv-vel');
  const pmvTrInput = document.getElementById('pmv-tr');
  const pressureDisplay = document.getElementById('pressure-display');
  const btnUpdateConfig = document.getElementById('btn-update-config');
  const configHint = document.getElementById('config-hint');

  const inputMode = document.getElementById('input-mode');
  const inputT = document.getElementById('input-t');
  const inputPhi = document.getElementById('input-phi');
  const inputX = document.getElementById('input-x');
  const phiGroup = document.getElementById('phi-input-group');
  const xGroup = document.getElementById('x-input-group');
  const btnAddPoint = document.getElementById('btn-add-point');
  const addPointHint = document.getElementById('add-point-hint');

  const pointsList = document.getElementById('points-list');
  const btnClearPoints = document.getElementById('btn-clear-points');

  const flowType = document.getElementById('flow-type');
  const flowValue = document.getElementById('flow-value');
  const flowUnit = document.getElementById('flow-unit');
  const powerResults = document.getElementById('power-results');

  // PMV-Parameter nach EN ISO 7730; leeres t_r bedeutet „Strahlungstemperatur = T"
  // und wird als null weitergereicht (das Diagramm setzt dann t_r = t_a je Gitterpunkt).
  function getPmvParams(messages = [], writeBack = false) {
    const trRaw = parseFloat(pmvTrInput.value);
    return {
      clo: readClamped(pmvCloInput, 0.5, 'Bekleidung', 'clo', messages, writeBack),
      met: readClamped(pmvMetInput, 1.2, 'Aktivität', 'met', messages, writeBack),
      vel: readClamped(pmvVelInput, 0.1, 'Luftgeschwindigkeit', 'm/s', messages, writeBack),
      tr: Number.isFinite(trRaw)
        ? readClamped(pmvTrInput, trRaw, 't_r', '°C', messages, writeBack)
        : null,
    };
  }

  function showConfigHint(messages) {
    configHint.textContent = messages.join(' ');
    configHint.classList.toggle('hidden', messages.length === 0);
  }

  function updatePressureDisplay() {
    // Beim Tippen nur anzeigen und melden, nicht ins Feld zurückschreiben
    const messages = [];
    const altitude = readClamped(altitudeInput, 500, 'Höhe ü. M.', 'm', messages, false);
    pressureDisplay.textContent = `≈ ${(pressureFromAltitude(altitude) / 100).toFixed(0)} mbar`;
    showConfigHint(messages);
  }

  // Alle Felder auf ihre min/max-Attribute klemmen; messages sammelt die
  // Begrenzungs-Meldungen, writeBack schreibt geklemmte Werte ins Feld zurück
  function getConfig(messages = [], writeBack = false) {
    const altitude = readClamped(altitudeInput, 500, 'Höhe ü. M.', 'm', messages, writeBack);
    const tMin = readClamped(tMinInput, -10, 'T min', '°C', messages, writeBack);
    let tMax = readClamped(tMaxInput, 50, 'T max', '°C', messages, writeBack);
    // Durch die Attributgrenzen (tMin ≤ 0 < 20 ≤ tMax) nicht mehr erreichbar; Absicherung
    if (tMax <= tMin) {
      tMax = tMin + 10;
      messages.push(`T max muss über T min liegen; auf ${tMax} °C gesetzt.`);
      if (writeBack) tMaxInput.value = tMax;
    }
    return {
      altitude,
      pressure: pressureFromAltitude(altitude),
      tMin,
      tMax,
      xMax: readClamped(xMaxInput, 30, 'x max', 'g/kg', messages, writeBack),
      showComfort: showComfortCheckbox.checked,
      showSultriness: showSultrinessCheckbox.checked,
      showPmv: showPmvCheckbox.checked,
      pmvParams: getPmvParams(messages, writeBack),
    };
  }

  altitudeInput.addEventListener('input', updatePressureDisplay);

  // Overlays sofort ein-/ausblenden (kein „Diagramm aktualisieren" nötig)
  showComfortCheckbox.addEventListener('change', () => {
    diagram.setShowComfort(showComfortCheckbox.checked);
  });
  showSultrinessCheckbox.addEventListener('change', () => {
    diagram.setShowSultriness(showSultrinessCheckbox.checked);
  });
  showPmvCheckbox.addEventListener('change', () => {
    diagram.setShowPmv(showPmvCheckbox.checked);
  });

  // PMV-Parameter wirken ohne Write-Back, damit beim Tippen nicht in das Feld
  // hineinkorrigiert wird (wie bei der Höhe ü. M.).
  // Entprellt, weil Zwischenstände beim Tippen physikalisch gültig, aber extrem
  // sind: t_r geht etwa gleich stark ein wie die Lufttemperatur, „2" auf dem Weg
  // zu „20" verschiebt die Zonen um ~18 K an den oberen Diagrammrand.
  let pmvTimer = null;
  for (const input of [pmvCloInput, pmvMetInput, pmvVelInput, pmvTrInput]) {
    input.addEventListener('input', () => {
      clearTimeout(pmvTimer);
      pmvTimer = setTimeout(() => {
        const messages = [];
        diagram.setPmvParams(getPmvParams(messages, false));
        showConfigHint(messages);
      }, 400);
    });
    // Verlassen des Feldes wirkt sofort und schreibt geklemmte Werte zurück
    input.addEventListener('change', () => {
      clearTimeout(pmvTimer);
      const messages = [];
      diagram.setPmvParams(getPmvParams(messages, true));
      showConfigHint(messages);
    });
  }

  btnUpdateConfig.addEventListener('click', () => {
    const messages = [];
    const config = getConfig(messages, true);
    showConfigHint(messages);
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

  function showAddPointHint(message) {
    addPointHint.textContent = message;
    addPointHint.classList.toggle('hidden', !message);
  }

  btnAddPoint.addEventListener('click', () => {
    const T = parseFloat(inputT.value);
    if (isNaN(T)) {
      showAddPointHint('Gültige Temperatur eingeben.');
      return;
    }

    const config = getConfig();
    let x_gkg;

    if (inputMode.value === 'phi') {
      const phi = parseFloat(inputPhi.value) / 100;
      if (isNaN(phi) || phi < 0 || phi > 1) {
        showAddPointHint('φ muss zwischen 0 und 100 % liegen.');
        return;
      }
      x_gkg = humidityRatio(T, phi, config.pressure) * 1000;
      if (!Number.isFinite(x_gkg)) {
        showAddPointHint('Bei dieser Temperatur ergibt die φ-Eingabe keine gültige Feuchte.');
        return;
      }
    } else {
      x_gkg = parseFloat(inputX.value);
      if (isNaN(x_gkg) || x_gkg < 0) {
        showAddPointHint('x muss eine Zahl ≥ 0 sein.');
        return;
      }
    }

    // Nur Punkte im dargestellten Bereich zulassen: geclippte (unsichtbare) Punkte
    // flossen sonst kommentarlos in Prozesslinie und Leistungsberechnung ein
    if (T < config.tMin || T > config.tMax || x_gkg > config.xMax) {
      showAddPointHint(
        `Punkt liegt ausserhalb des Diagramms (T ${config.tMin} bis ${config.tMax} °C, x bis ${config.xMax} g/kg).`,
      );
      return;
    }

    showAddPointHint('');
    diagram.addStatePoint(T, x_gkg);
  });

  btnClearPoints.addEventListener('click', () => {
    // clearStatePoints leert Punktliste und Leistungsanzeige via onPointsChanged
    diagram.clearStatePoints();
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

    // Gesamtbilanz über die ganze Prozesskette. Bewusst nach Wirkrichtung
    // getrennt statt saldiert: Heizen und Kühlen bzw. Be- und Entfeuchten
    // heben sich in einer Anlage nicht auf, sondern brauchen je eigene
    // Erzeuger – die Summe der Beträge ist die auslegungsrelevante Grösse.
    if (segments.length > 1) {
      const sumOver = (select) => segments.reduce((sum, s) => sum + Math.max(0, select(s)), 0);
      const totals = [
        ['Σ Heizleistung', sumOver(s => s.Q), 'kW'],
        ['Σ Kühlleistung', sumOver(s => -s.Q), 'kW'],
        ['Σ Befeuchtung', sumOver(s => s.waterFlow), 'kg/h'],
        ['Σ Entfeuchtung', sumOver(s => -s.waterFlow), 'kg/h'],
      ];
      const card = document.createElement('div');
      card.className = 'power-card power-total';
      card.innerHTML = `
        <div class="power-label">Gesamt ${points[0].label} → ${points[points.length - 1].label}</div>
        <div class="power-values">
          ${totals.map(([label, value, unit]) => `
            <span>${label}</span>
            <span class="power-sum-value">${value.toFixed(2)} ${unit}</span>
          `).join('')}
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

  updatePressureDisplay();
  populateFlowUnits();
  renderPointsList([]);
  renderPowerResults([]);
  // Browser restaurieren Formularzustände beim Reload: Diagramm mit der
  // tatsächlichen Checkbox-Stellung abgleichen, nicht mit defaultConfig
  diagram.setPmvParams(getPmvParams());
  diagram.setShowComfort(showComfortCheckbox.checked);
  diagram.setShowSultriness(showSultrinessCheckbox.checked);
  diagram.setShowPmv(showPmvCheckbox.checked);
}
