import * as d3 from 'd3';
import * as psy from './psychrometrics.js';

// Monochromes Farbschema nach Seven-Air-Vorlage: alle Diagrammlinien schwarz/grau,
// nur interaktive Elemente (Zustandspunkte, Prozesslinien) farbig
const COLORS = {
  grid: '#b0b0b0',
  gridMinor: '#dcdcdc',
  enthalpy: '#4b4b4b',
  enthalpyLabel: '#4b4b4b',
  phi: '#1a1a1a',
  phiLabel: '#1a1a1a',
  saturation: '#000000',
  saturationFill: 'rgba(0, 0, 0, 0.04)',
  axis: '#1a1a1a',
  axisLabel: '#1a1a1a',
  point: '#dc2626',
  processLine: '#dc2626',
};

// Behaglichkeitszonen nach HSLU-edar-Referenz (comfortTempHum.Rmd):
// Polygone in (T in °C, φ in %); Kanten werden über φ→x ins h,x-Koordinatensystem
// transformiert (aus Geraden werden dabei druckabhängige Kurven).
// labelAnchor ebenfalls in (T, φ).
const COMFORT_ZONES = [
  {
    name: 'noch behaglich',
    fill: 'rgba(255, 165, 0, 0.25)',
    stroke: 'rgba(217, 119, 6, 0.6)',
    labelColor: '#b45309',
    labelAnchor: [21.5, 26],
    vertices: [[20, 20], [17, 40], [16, 75], [17, 85], [21.5, 80], [25, 60], [27, 30], [25.5, 20]],
  },
  {
    name: 'behaglich',
    fill: 'rgba(154, 205, 50, 0.4)',
    stroke: 'rgba(77, 124, 15, 0.6)',
    labelColor: '#4d7c0f',
    labelAnchor: [20.8, 53],
    vertices: [[19, 38], [17.5, 74], [22.5, 65], [24, 35]],
  },
];

export class HXDiagram {
  constructor(container, config, callbacks = {}) {
    this.container = container;
    this.config = { ...config };
    this.callbacks = callbacks;
    this.statePoints = [];
    this.nextPointId = 1;

    this.width = 1200;
    this.height = 820;
    // Ränder gross genug für Beschriftungen ausserhalb des Rahmens (wie Seven-Air-Vorlage)
    this.margin = { top: 62, right: 70, bottom: 65, left: 92 };

    this.initSVG();
    this.update(config);
  }

  initSVG() {
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const plotW = this.width - this.margin.left - this.margin.right;
    const plotH = this.height - this.margin.top - this.margin.bottom;

    this.svg.append('defs')
      .append('clipPath')
      .attr('id', 'plot-clip')
      .append('rect')
      .attr('x', this.margin.left)
      .attr('y', this.margin.top)
      .attr('width', plotW)
      .attr('height', plotH);

    this.gridGroup = this.svg.append('g').attr('clip-path', 'url(#plot-clip)');
    this.enthalpyGroup = this.svg.append('g').attr('clip-path', 'url(#plot-clip)');
    this.phiGroup = this.svg.append('g').attr('clip-path', 'url(#plot-clip)');
    this.fogGroup = this.svg.append('g').attr('clip-path', 'url(#plot-clip)');
    this.comfortGroup = this.svg.append('g').attr('clip-path', 'url(#plot-clip)');
    this.satGroup = this.svg.append('g').attr('clip-path', 'url(#plot-clip)');
    this.processGroup = this.svg.append('g').attr('clip-path', 'url(#plot-clip)');
    this.pointsGroup = this.svg.append('g').attr('clip-path', 'url(#plot-clip)');
    this.axesGroup = this.svg.append('g');
    this.labelGroup = this.svg.append('g');

    this.tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('display', 'none');

    this.setupClickHandler();
  }

  update(config) {
    this.config = { ...config };
    // Abgeleitete Grössen (φ, h, Taupunkt, …) hängen vom Druck ab
    this.statePoints.forEach(p => {
      Object.assign(p, psy.stateFromTX(p.T, p.x, this.config.pressure));
    });
    this.createScales();
    this.render();
    this.renderStatePoints();
  }

  createScales() {
    const { tMin, tMax, xMax } = this.config;
    const plotW = this.width - this.margin.left - this.margin.right;
    const plotH = this.height - this.margin.top - this.margin.bottom;

    this.xScale = d3.scaleLinear()
      .domain([0, xMax])
      .range([this.margin.left, this.margin.left + plotW]);

    this.yScale = d3.scaleLinear()
      .domain([tMin, tMax])
      .range([this.margin.top + plotH, this.margin.top]);
  }

  render() {
    this.gridGroup.selectAll('*').remove();
    this.enthalpyGroup.selectAll('*').remove();
    this.phiGroup.selectAll('*').remove();
    this.fogGroup.selectAll('*').remove();
    this.satGroup.selectAll('*').remove();
    this.axesGroup.selectAll('*').remove();
    this.labelGroup.selectAll('*').remove();

    this.drawGrid();
    this.drawEnthalpyLines();
    this.drawPhiLines();
    this.drawSaturationCurve();
    this.drawComfortZones();
    this.drawAxes();
    this.drawTitle();
  }

  // Behaglichkeitszonen als transparente Overlays (zuschaltbar über config.showComfort)
  drawComfortZones() {
    this.comfortGroup.selectAll('*').remove();
    if (!this.config.showComfort) return;

    const { pressure } = this.config;
    const toXY = (T, phiPct) => [psy.humidityRatio(T, phiPct / 100, pressure) * 1000, T];

    const line = d3.line()
      .x(d => this.xScale(d[0]))
      .y(d => this.yScale(d[1]));

    for (const zone of COMFORT_ZONES) {
      // Kanten in (T, φ) linear abtasten, damit sie im h,x-System korrekt gekrümmt sind
      const points = [];
      const n = zone.vertices.length;
      for (let i = 0; i < n; i++) {
        const [T1, phi1] = zone.vertices[i];
        const [T2, phi2] = zone.vertices[(i + 1) % n];
        const steps = 8;
        for (let s = 0; s < steps; s++) {
          const T = T1 + (s / steps) * (T2 - T1);
          const phi = phi1 + (s / steps) * (phi2 - phi1);
          points.push(toXY(T, phi));
        }
      }

      this.comfortGroup.append('path')
        .attr('d', line(points) + 'Z')
        .attr('fill', zone.fill)
        .attr('stroke', zone.stroke)
        .attr('stroke-width', 1);

      const [aT, aPhi] = zone.labelAnchor;
      const [ax, ay] = toXY(aT, aPhi);
      this.comfortGroup.append('text')
        .attr('x', this.xScale(ax))
        .attr('y', this.yScale(ay))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px')
        .attr('font-style', 'italic')
        .attr('fill', zone.labelColor)
        .text(zone.name);
    }
  }

  setShowComfort(visible) {
    this.config.showComfort = visible;
    this.drawComfortZones();
  }

  drawGrid() {
    const { tMin, tMax, xMax } = this.config;

    // Isothermen (horizontal)
    for (let T = Math.ceil(tMin); T <= tMax; T++) {
      const isMajor = T % 5 === 0;
      this.gridGroup.append('line')
        .attr('x1', this.xScale(0))
        .attr('x2', this.xScale(xMax))
        .attr('y1', this.yScale(T))
        .attr('y2', this.yScale(T))
        .attr('stroke', isMajor ? COLORS.grid : COLORS.gridMinor)
        .attr('stroke-width', isMajor ? 0.6 : 0.3);
    }

    // Vertikale x-Linien
    for (let x = 0; x <= xMax; x++) {
      const isMajor = x % 5 === 0;
      this.gridGroup.append('line')
        .attr('x1', this.xScale(x))
        .attr('x2', this.xScale(x))
        .attr('y1', this.yScale(tMin))
        .attr('y2', this.yScale(tMax))
        .attr('stroke', isMajor ? COLORS.grid : COLORS.gridMinor)
        .attr('stroke-width', isMajor ? 0.6 : 0.3);
    }
  }

  drawEnthalpyLines() {
    const { tMin, tMax, xMax } = this.config;

    const hMin = psy.enthalpy(tMin, 0);
    const hMax = psy.enthalpy(tMax, xMax / 1000);
    const hStep = 5;
    const hStart = Math.floor(hMin / hStep) * hStep;
    const hEnd = Math.ceil(hMax / hStep) * hStep;

    const line = d3.line()
      .x(d => this.xScale(d[0]))
      .y(d => this.yScale(d[1]));

    // x-Position (g/kg) einer Enthalpielinie bei Temperatur T: h = 1.006·T + x·(2501 + 1.86·T)
    const xAtT = (h, T) => 1000 * (h - 1.006 * T) / (2501 + 1.86 * T);

    for (let h = hStart; h <= hEnd; h += hStep) {
      // Exakte Schnittpunkte mit dem Rahmen: T fällt monoton mit x,
      // Eintritt also oben (tMax) oder links (x = 0), Austritt unten (tMin) oder rechts (xMax)
      const xStart = Math.max(0, xAtT(h, tMax));
      const xEnd = Math.min(xMax, xAtT(h, tMin));
      if (xEnd - xStart < 1e-9) continue;

      const points = [];
      const nSteps = 24;
      for (let i = 0; i <= nSteps; i++) {
        const x_gkg = xStart + (i / nSteps) * (xEnd - xStart);
        points.push([x_gkg, psy.temperatureFromEnthalpy(h, x_gkg / 1000)]);
      }

      const isLabel = h % 10 === 0;

      this.enthalpyGroup.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', COLORS.enthalpy)
        .attr('stroke-width', isLabel ? 0.7 : 0.35);

      if (isLabel) {
        this.placeEnthalpyLabel(h, points);
      }
    }

    this.drawEnthalpyAxisLabel();
  }

  // „Spezifische Enthalpie h in kJ/kg" diagonal entlang der Linienrichtung (wie Vorlage)
  drawEnthalpyAxisLabel() {
    const { tMin, tMax, xMax } = this.config;
    const xLabel = xMax * 0.5;
    const tLabel = tMin + (tMax - tMin) * 0.14;
    const h = psy.enthalpy(tLabel, xLabel / 1000);

    const dxg = xMax * 0.05;
    const t1 = psy.temperatureFromEnthalpy(h, (xLabel - dxg) / 1000);
    const t2 = psy.temperatureFromEnthalpy(h, (xLabel + dxg) / 1000);
    const dx = this.xScale(xLabel + dxg) - this.xScale(xLabel - dxg);
    const dy = this.yScale(t2) - this.yScale(t1);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    const px = this.xScale(xLabel);
    const py = this.yScale(tLabel) - 5;

    this.labelGroup.append('text')
      .attr('x', px)
      .attr('y', py)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-style', 'italic')
      .attr('fill', COLORS.enthalpyLabel)
      .attr('transform', `rotate(${angle}, ${px}, ${py})`)
      .text('Spezifische Enthalpie h in kJ/kg');
  }

  placeEnthalpyLabel(h, points) {
    const { tMax } = this.config;
    const first = points[0];
    const second = points[1];

    if (first[0] < 1e-6) {
      // Linie tritt links ein; Beschriftung ausserhalb, links der Achsen-Ticks
      this.labelGroup.append('text')
        .attr('x', this.xScale(0) - 32)
        .attr('y', this.yScale(psy.temperatureFromEnthalpy(h, 0)))
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '8px')
        .attr('fill', COLORS.enthalpyLabel)
        .text(`${h}`);
      return;
    }

    // Linie tritt oben ein; Beschriftung ausserhalb über dem Rahmen, entlang der Linie gedreht
    const xTop = 1000 * (h - 1.006 * tMax) / (2501 + 1.86 * tMax);
    const labelX = this.xScale(xTop);
    const labelY = this.yScale(tMax) - 6;
    const dx = this.xScale(second[0]) - this.xScale(first[0]);
    const dy = this.yScale(second[1]) - this.yScale(first[1]);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    this.labelGroup.append('text')
      .attr('x', labelX)
      .attr('y', labelY)
      .attr('text-anchor', 'end')
      .attr('font-size', '8px')
      .attr('fill', COLORS.enthalpyLabel)
      .attr('transform', `rotate(${angle}, ${labelX}, ${labelY})`)
      .text(`${h}`);
  }

  drawPhiLines() {
    const { tMin, tMax, xMax, pressure } = this.config;
    const phiValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

    const line = d3.line()
      .x(d => this.xScale(d[0]))
      .y(d => this.yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // x steigt monoton mit T; Kurven beginnen exakt am unteren Rand (tMin) und
    // enden exakt am oberen (tMax) bzw. interpoliert am rechten Rand (xMax)
    const nSteps = Math.max(2, Math.ceil((tMax - tMin) / 0.5));

    for (const phi of phiValues) {
      const points = [];
      let prev = null;
      for (let i = 0; i <= nSteps; i++) {
        const T = tMin + (i / nSteps) * (tMax - tMin);
        const x_gkg = psy.humidityRatio(T, phi, pressure) * 1000;
        if (!Number.isFinite(x_gkg)) break;
        if (x_gkg > xMax) {
          if (prev) {
            const t = (xMax - prev[0]) / (x_gkg - prev[0]);
            points.push([xMax, prev[1] + t * (T - prev[1])]);
          }
          break;
        }
        prev = [x_gkg, T];
        points.push(prev);
      }
      if (points.length < 2) continue;

      this.phiGroup.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', COLORS.phi)
        .attr('stroke-width', 0.5);

      // Beschriftung ausserhalb des Rahmens: über dem oberen bzw. rechts neben dem rechten Rand
      const labelPt = points[points.length - 1];
      const label = this.labelGroup.append('text')
        .attr('font-size', '9px')
        .attr('fill', COLORS.phiLabel)
        .text(`${Math.round(phi * 100)}%`);

      if (labelPt[1] >= tMax - 0.5) {
        label
          .attr('x', this.xScale(labelPt[0]))
          .attr('y', this.yScale(tMax) - 6)
          .attr('text-anchor', 'middle');
      } else {
        label
          .attr('x', this.xScale(xMax) + 6)
          .attr('y', this.yScale(labelPt[1]))
          .attr('text-anchor', 'start')
          .attr('dominant-baseline', 'middle');
      }
    }
  }

  drawSaturationCurve() {
    const { tMin, tMax, xMax, pressure } = this.config;
    const points = [];
    let prev = null;

    // x steigt monoton mit T; am rechten Rand Schnittpunkt interpolieren und abbrechen
    const nSteps = Math.max(2, Math.ceil((tMax - tMin) / 0.25));
    for (let i = 0; i <= nSteps; i++) {
      const T = tMin + (i / nSteps) * (tMax - tMin);
      const x_gkg = psy.humidityRatio(T, 1.0, pressure) * 1000;
      if (x_gkg > xMax) {
        if (prev) {
          const t = (xMax - prev[0]) / (x_gkg - prev[0]);
          points.push([xMax, prev[1] + t * (T - prev[1])]);
        }
        break;
      }
      prev = [x_gkg, T];
      points.push(prev);
    }
    if (points.length < 2) return;

    const line = d3.line()
      .x(d => this.xScale(d[0]))
      .y(d => this.yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Nebelgebiet schattieren (unterhalb der Sättigungslinie: x > x_s(T))
    // Tritt die Linie oben aus, ist auch der Streifen rechts davon Nebelgebiet
    const fogPoints = [...points];
    const last = points[points.length - 1];
    if (last[1] >= tMax - 0.5 && last[0] < xMax) {
      fogPoints.push([xMax, tMax]);
    }

    const areaGen = d3.area()
      .x(d => this.xScale(d[0]))
      .y0(this.yScale(tMin))
      .y1(d => this.yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    this.fogGroup.append('path')
      .datum(fogPoints)
      .attr('d', areaGen)
      .attr('fill', COLORS.saturationFill)
      .attr('stroke', 'none');

    // Sättigungslinie
    this.satGroup.append('path')
      .datum(points)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', COLORS.saturation)
      .attr('stroke-width', 2);

    // Beschriftung ausserhalb des Rahmens am Linienende
    const satLabel = this.labelGroup.append('text')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', COLORS.saturation)
      .text('φ = 100 %');

    if (last[1] >= tMax - 0.5) {
      satLabel
        .attr('x', this.xScale(last[0]))
        .attr('y', this.yScale(tMax) - 6)
        .attr('text-anchor', 'middle');
    } else {
      satLabel
        .attr('x', this.xScale(xMax) + 6)
        .attr('y', this.yScale(last[1]))
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle');
    }
  }

  drawAxes() {
    const { tMin, tMax, xMax } = this.config;
    const plotBottom = this.yScale(tMin);
    const plotTop = this.yScale(tMax);
    const plotLeft = this.xScale(0);
    const plotRight = this.xScale(xMax);

    // X-Achse (unten)
    const xAxis = d3.axisBottom(this.xScale)
      .tickValues(d3.range(0, xMax + 1, xMax <= 20 ? 1 : (xMax <= 40 ? 2 : 5)))
      .tickSize(6);

    this.axesGroup.append('g')
      .attr('transform', `translate(0, ${plotBottom})`)
      .call(xAxis)
      .call(g => g.select('.domain').attr('stroke', COLORS.axis))
      .call(g => g.selectAll('.tick line').attr('stroke', COLORS.axis))
      .call(g => g.selectAll('.tick text').attr('fill', COLORS.axis).attr('font-size', '10px'));

    this.axesGroup.append('text')
      .attr('x', (plotLeft + plotRight) / 2)
      .attr('y', plotBottom + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', COLORS.axisLabel)
      .text('Wasserdampfgehalt x in g/kg');

    // Y-Achse (links)
    const tStep = (tMax - tMin) <= 30 ? 1 : ((tMax - tMin) <= 60 ? 5 : 10);
    const yAxis = d3.axisLeft(this.yScale)
      .tickValues(d3.range(tMin, tMax + 1, tStep))
      .tickSize(6);

    this.axesGroup.append('g')
      .attr('transform', `translate(${plotLeft}, 0)`)
      .call(yAxis)
      .call(g => g.select('.domain').attr('stroke', COLORS.axis))
      .call(g => g.selectAll('.tick line').attr('stroke', COLORS.axis))
      .call(g => g.selectAll('.tick text').attr('fill', COLORS.axis).attr('font-size', '10px'));

    this.axesGroup.append('text')
      .attr('x', -(plotTop + plotBottom) / 2)
      .attr('y', plotLeft - 66)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', COLORS.axisLabel)
      .attr('transform', 'rotate(-90)')
      .text('Temperatur t in °C');

    // Einheit der Enthalpie-Spalte links ausserhalb
    this.axesGroup.append('text')
      .attr('x', plotLeft - 32)
      .attr('y', plotTop - 8)
      .attr('text-anchor', 'end')
      .attr('font-size', '8px')
      .attr('fill', COLORS.enthalpyLabel)
      .text('h in kJ/kg');

    // Überschrift der φ-Beschriftungen über dem oberen Rand (wie Vorlage)
    this.axesGroup.append('text')
      .attr('x', plotLeft + 4)
      .attr('y', plotTop - 8)
      .attr('text-anchor', 'start')
      .attr('font-size', '9px')
      .attr('fill', COLORS.phiLabel)
      .text('Relative Feuchtigkeit φ in %');

    // Rahmen
    this.axesGroup.append('rect')
      .attr('x', plotLeft)
      .attr('y', plotTop)
      .attr('width', plotRight - plotLeft)
      .attr('height', plotBottom - plotTop)
      .attr('fill', 'none')
      .attr('stroke', COLORS.axis)
      .attr('stroke-width', 1);
  }

  drawTitle() {
    const p_mbar = (this.config.pressure / 100).toFixed(0);
    const h_m = this.config.altitude;

    this.labelGroup.append('text')
      .attr('x', this.width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', COLORS.axisLabel)
      .text('h,x-Diagramm für feuchte Luft');

    this.labelGroup.append('text')
      .attr('x', this.width / 2)
      .attr('y', 38)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', COLORS.enthalpyLabel)
      .text(`p = ${p_mbar} mbar, H = ${h_m} m.ü.M.`);
  }

  // --- Zustandspunkte ---

  addStatePoint(T, x_gkg) {
    const state = psy.stateFromTX(T, x_gkg, this.config.pressure);
    const point = {
      id: this.nextPointId++,
      ...state,
      label: `P${this.statePoints.length + 1}`,
    };
    this.statePoints.push(point);
    this.renderStatePoints();
    return point;
  }

  removeStatePoint(id) {
    this.statePoints = this.statePoints.filter(p => p.id !== id);
    this.relabelPoints();
    this.renderStatePoints();
  }

  clearStatePoints() {
    this.statePoints = [];
    this.nextPointId = 1;
    this.renderStatePoints();
  }

  relabelPoints() {
    this.statePoints.forEach((p, i) => {
      p.label = `P${i + 1}`;
    });
  }

  updatePointPosition(id, T, x_gkg) {
    const point = this.statePoints.find(p => p.id === id);
    if (!point) return;
    const state = psy.stateFromTX(T, x_gkg, this.config.pressure);
    Object.assign(point, state);
    this.renderStatePoints();
  }

  renderStatePoints() {
    this.processGroup.selectAll('*').remove();
    this.pointsGroup.selectAll('*').remove();

    // Prozesslinien
    if (this.statePoints.length >= 2) {
      const line = d3.line()
        .x(d => this.xScale(d.x))
        .y(d => this.yScale(d.T));

      this.processGroup.append('path')
        .datum(this.statePoints)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', COLORS.processLine)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,3')
        .attr('opacity', 0.8);
    }

    // Punkte
    const self = this;
    const drag = d3.drag()
      // Gestenursprung in Pixelkoordinaten; das Datum selbst (d.x in g/kg) taugt nicht als subject
      .subject((event, d) => ({ x: self.xScale(d.x), y: self.yScale(d.T) }))
      .on('start', function () {
        d3.select(this).raise().attr('opacity', 0.7);
      })
      .on('drag', function (event) {
        const id = +d3.select(this).attr('data-id');
        let newX = self.xScale.invert(event.x);
        let newT = self.yScale.invert(event.y);

        newX = Math.max(0, Math.min(self.config.xMax, newX));
        newT = Math.max(self.config.tMin, Math.min(self.config.tMax, newT));

        self.updatePointPosition(id, newT, newX);
        if (self.callbacks.onPointsChanged) {
          self.callbacks.onPointsChanged(self.statePoints);
        }
      })
      .on('end', function () {
        d3.select(this).attr('opacity', 1);
      });

    const groups = this.pointsGroup.selectAll('g.state-point')
      .data(this.statePoints, d => d.id)
      .join('g')
      .attr('class', 'state-point')
      .attr('data-id', d => d.id)
      .attr('transform', d => `translate(${this.xScale(d.x)}, ${this.yScale(d.T)})`)
      .style('cursor', 'grab')
      .call(drag);

    groups.append('circle')
      .attr('r', 6)
      .attr('fill', COLORS.point)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    groups.append('text')
      .attr('x', 10)
      .attr('y', -8)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', COLORS.point)
      .text(d => d.label);

    // Tooltip bei Hover
    groups
      .on('mouseenter', (event, d) => {
        this.tooltip
          .style('display', 'block')
          .html(`
            <strong>${d.label}</strong><br>
            T = ${d.T.toFixed(1)} °C<br>
            x = ${d.x.toFixed(2)} g/kg<br>
            φ = ${(d.phi * 100).toFixed(1)} %<br>
            h = ${d.h.toFixed(1)} kJ/kg<br>
            T<sub>d</sub> = ${d.Td.toFixed(1)} °C${d.fog ? '<br><em>Nebelgebiet (übersättigt)</em>' : ''}
          `);
      })
      .on('mousemove', (event) => {
        this.tooltip
          .style('left', (event.pageX + 14) + 'px')
          .style('top', (event.pageY - 14) + 'px');
      })
      .on('mouseleave', () => {
        this.tooltip.style('display', 'none');
      });

    if (this.callbacks.onPointsChanged) {
      this.callbacks.onPointsChanged(this.statePoints);
    }
  }

  setupClickHandler() {
    const plotLeft = this.margin.left;
    const plotTop = this.margin.top;
    const plotRight = this.width - this.margin.right;
    const plotBottom = this.height - this.margin.bottom;

    this.svg.on('click', (event) => {
      if (event.target.closest('.state-point')) return;

      const [mx, my] = d3.pointer(event);
      if (mx < plotLeft || mx > plotRight || my < plotTop || my > plotBottom) return;

      const x_gkg = this.xScale.invert(mx);
      const T = this.yScale.invert(my);

      const point = this.addStatePoint(T, x_gkg);
      if (this.callbacks.onPointAdded) {
        this.callbacks.onPointAdded(point);
      }
    });
  }
}
