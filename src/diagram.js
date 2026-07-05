import * as d3 from 'd3';
import * as psy from './psychrometrics.js';

const COLORS = {
  grid: '#d4d4d4',
  gridMinor: '#e8e8e8',
  enthalpy: '#9ca3af',
  enthalpyLabel: '#9ca3af',
  phi: '#4472C4',
  phiLabel: '#3b63a6',
  saturation: '#1e3a5f',
  saturationFill: 'rgba(219, 234, 254, 0.25)',
  axis: '#374151',
  axisLabel: '#374151',
  point: '#dc2626',
  processLine: '#dc2626',
};

export class HXDiagram {
  constructor(container, config, callbacks = {}) {
    this.container = container;
    this.config = { ...config };
    this.callbacks = callbacks;
    this.statePoints = [];
    this.nextPointId = 1;

    this.width = 1200;
    this.height = 820;
    this.margin = { top: 55, right: 50, bottom: 65, left: 65 };

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
    this.drawAxes();
    this.drawTitle();
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

    for (let h = hStart; h <= hEnd; h += hStep) {
      const points = [];
      for (let x_gkg = 0; x_gkg <= xMax; x_gkg += 0.5) {
        const x_kgkg = x_gkg / 1000;
        const T = psy.temperatureFromEnthalpy(h, x_kgkg);
        if (T >= tMin && T <= tMax) {
          points.push([x_gkg, T]);
        }
      }
      if (points.length < 2) continue;

      const isLabel = h % 10 === 0;

      this.enthalpyGroup.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', COLORS.enthalpy)
        .attr('stroke-width', isLabel ? 0.6 : 0.3)
        .attr('stroke-dasharray', isLabel ? 'none' : '2,2');

      if (isLabel && points.length >= 2) {
        this.placeEnthalpyLabel(h, points);
      }
    }
  }

  placeEnthalpyLabel(h, points) {
    const { tMax } = this.config;
    const first = points[0];
    const second = points[1];

    let labelX, labelY;
    if (first[1] >= tMax - 0.5) {
      labelX = this.xScale(first[0]);
      labelY = this.yScale(tMax) - 4;
    } else {
      labelX = this.xScale(0) - 4;
      labelY = this.yScale(first[1]);
    }

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

    for (const phi of phiValues) {
      const points = [];
      for (let T = tMin; T <= tMax; T += 0.5) {
        const x_kgkg = psy.humidityRatio(T, phi, pressure);
        const x_gkg = x_kgkg * 1000;
        if (x_gkg >= 0 && x_gkg <= xMax) {
          points.push([x_gkg, T]);
        }
      }
      if (points.length < 2) continue;

      this.phiGroup.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', COLORS.phi)
        .attr('stroke-width', 0.7)
        .attr('opacity', 0.7);

      const labelPt = points[points.length - 1];
      const prevPt = points[points.length - 2];
      const dx = this.xScale(labelPt[0]) - this.xScale(prevPt[0]);
      const dy = this.yScale(labelPt[1]) - this.yScale(prevPt[1]);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      this.labelGroup.append('text')
        .attr('x', this.xScale(labelPt[0]) + 3)
        .attr('y', this.yScale(labelPt[1]))
        .attr('font-size', '9px')
        .attr('fill', COLORS.phiLabel)
        .attr('dominant-baseline', 'middle')
        .attr('transform', `rotate(${angle}, ${this.xScale(labelPt[0]) + 3}, ${this.yScale(labelPt[1])})`)
        .text(`${Math.round(phi * 100)}%`);
    }
  }

  drawSaturationCurve() {
    const { tMin, tMax, xMax, pressure } = this.config;
    const points = [];
    let prev = null;

    // x steigt monoton mit T – am rechten Rand Schnittpunkt interpolieren und abbrechen
    for (let T = tMin; T <= tMax; T += 0.25) {
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
    const areaGen = d3.area()
      .x(d => this.xScale(d[0]))
      .y0(this.yScale(tMin))
      .y1(d => this.yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    this.fogGroup.append('path')
      .datum(points)
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

    // Beschriftung
    const midIdx = Math.floor(points.length * 0.6);
    if (midIdx < points.length) {
      const pt = points[midIdx];
      if (pt[0] <= xMax) {
        this.labelGroup.append('text')
          .attr('x', this.xScale(pt[0]) + 8)
          .attr('y', this.yScale(pt[1]) - 8)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', COLORS.saturation)
          .text('φ = 100 %');
      }
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
      .attr('y', plotLeft - 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', COLORS.axisLabel)
      .attr('transform', 'rotate(-90)')
      .text('Temperatur T in °C');

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
      .text(`p = ${p_mbar} mbar, H = ${h_m} m ü.M.`);
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
      // Gestenursprung in Pixelkoordinaten – das Datum selbst (d.x in g/kg) taugt nicht als subject
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
            T<sub>d</sub> = ${d.Td.toFixed(1)} °C
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
