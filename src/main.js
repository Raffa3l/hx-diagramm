import { HXDiagram } from './diagram.js';
import { setupUI } from './ui.js';
import { pressureFromAltitude } from './psychrometrics.js';

const defaultConfig = {
  altitude: 500,
  pressure: pressureFromAltitude(500),
  tMin: -10,
  tMax: 50,
  xMax: 30,
  showComfort: false,
  showSultriness: false,
  showPmv: false,
  // EN ISO 7730: leichte Sommerbekleidung, sitzende Tätigkeit, ruhende Luft,
  // t_r = null bedeutet Strahlungstemperatur = Lufttemperatur
  pmvParams: { clo: 0.5, met: 1.2, vel: 0.1, tr: null },
};

const diagram = new HXDiagram(
  document.getElementById('diagram-container'),
  defaultConfig,
);

setupUI(diagram);
