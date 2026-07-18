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
};

const diagram = new HXDiagram(
  document.getElementById('diagram-container'),
  defaultConfig,
);

setupUI(diagram);
