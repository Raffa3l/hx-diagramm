// Psychrometrische Berechnungen für feuchte Luft.
// Formeln und Konstanten nach VDI 4670 Blatt 1 bzw. ASHRAE Fundamentals (Kap. 1, Psychrometrics);
// Sättigungsdampfdruck nach Magnus mit Tetens-Koeffizienten (vgl. VDI 3786 Blatt 4).
// Einheiten: T in °C, p in Pa, x in kg/kg trockene Luft, h in kJ/kg trockene Luft.

// Konstanten (SI)
const R_DRY = 287.05;  // J/(kg·K)  spezifische Gaskonstante trockene Luft
const EPS = 0.622;     // -         Verhältnis der Gaskonstanten R_d/R_v (genauer 0.62198)
const RV_RD = 1.608;   // -         R_v/R_d = 1/EPS
const CP_AIR = 1.006;  // kJ/(kg·K) spezifische Wärmekapazität trockene Luft
const CP_VAP = 1.86;   // kJ/(kg·K) spezifische Wärmekapazität Wasserdampf
const CP_WAT = 4.19;   // kJ/(kg·K) spezifische Wärmekapazität flüssiges Wasser
const R0 = 2501;       // kJ/kg     spezifische Verdampfungsenthalpie von Wasser bei 0 °C

// Barometrischer Druck aus Höhe (ICAO-Standardatmosphäre)
// altitude in m, Rückgabe in Pa
export function pressureFromAltitude(altitude) {
  return 101325 * Math.pow(1 - 2.25577e-5 * altitude, 5.25588);
}

// Sättigungsdampfdruck (Magnus-Formel, Tetens-Koeffizienten)
// über Wasser (T ≥ 0 °C) bzw. über Eis (T < 0 °C); T in °C, Rückgabe in Pa
export function saturationPressure(T) {
  if (T >= 0) {
    return 610.5 * Math.exp(17.269 * T / (237.29 + T));
  }
  return 610.5 * Math.exp(21.875 * T / (265.5 + T));
}

// Absolute Feuchte x aus T und φ
// T in °C, phi 0..1, p in Pa, Rückgabe in kg/kg
export function humidityRatio(T, phi, p) {
  const ps = saturationPressure(T);
  const pD = phi * ps;
  if (pD >= p) return Infinity;
  return EPS * pD / (p - pD);
}

// Partialdruck des Wasserdampfes (Pa)
// x in kg/kg, p in Pa
export function partialPressure(x, p) {
  return x * p / (EPS + x);
}

// Relative Feuchte φ aus T und x (nur ungesättigt sinnvoll, x ≤ x_s)
// T in °C, x in kg/kg, p in Pa, Rückgabe 0..1+
export function relativeHumidity(T, x, p) {
  const ps = saturationPressure(T);
  if (ps <= 0) return 0;
  return partialPressure(x, p) / ps;
}

// Spezifische Enthalpie ungesättigter feuchter Luft (kJ/kg trockene Luft)
// h = cp_L·T + x·(r0 + cp_D·T); T in °C, x in kg/kg
export function enthalpy(T, x) {
  return CP_AIR * T + x * (R0 + CP_VAP * T);
}

// Spezifische Enthalpie im Nebelgebiet (x > x_s): nur x_s ist dampfförmig,
// der Rest (x − x_s) liegt als flüssiges Wasser vor (VDI 4670):
// h = cp_L·T + x_s·(r0 + cp_D·T) + (x − x_s)·cp_W·T
export function enthalpyFog(T, x, xs) {
  return enthalpy(T, xs) + (x - xs) * CP_WAT * T;
}

// Temperatur aus Enthalpie und x (ungesättigt)
// h in kJ/kg, x in kg/kg, Rückgabe in °C
export function temperatureFromEnthalpy(h, x) {
  return (h - R0 * x) / (CP_AIR + CP_VAP * x);
}

// Absolute Feuchte auf einer Isenthalpe bei Temperatur T (Umkehrung von enthalpy nach x)
// h in kJ/kg, T in °C, Rückgabe in kg/kg
export function humidityRatioFromEnthalpy(h, T) {
  return (h - CP_AIR * T) / (R0 + CP_VAP * T);
}

// Taupunkt aus Partialdruck (Umkehrung der Magnus-Formel,
// Zweigwahl konsistent zu saturationPressure)
// pD in Pa, Rückgabe in °C
export function dewPointFromPartialPressure(pD) {
  if (pD <= 0) return -273.15;
  const lnRatio = Math.log(pD / 610.5);
  const Td_above = 237.29 * lnRatio / (17.269 - lnRatio);
  if (Td_above >= 0) return Td_above;
  return 265.5 * lnRatio / (21.875 - lnRatio);
}

// Taupunkt aus x und p
// x in kg/kg, p in Pa
export function dewPointFromX(x, p) {
  return dewPointFromPartialPressure(partialPressure(x, p));
}

// Dichte feuchter Luft (kg/m³): Gesamtmasse (1 + x) pro Volumen der Gasphase.
// xVapor ist der dampfförmige Anteil; im Nebelgebiet xVapor = x_s
// (Volumen der Wassertropfen vernachlässigt), sonst xVapor = x.
// T in °C, x in kg/kg, p in Pa
export function density(T, x, p, xVapor = x) {
  const Tabs = T + 273.15;
  return p / (R_DRY * Tabs) * (1 + x) / (1 + RV_RD * xVapor);
}

// --- Thermische Behaglichkeit: PMV/PPD nach EN ISO 7730 ---
// Iterationsalgorithmus nach EN ISO 7730 Anhang D (gleichlautend in ASHRAE 55).
// Die Bekleidungsoberflächentemperatur t_cl folgt aus einer Fixpunktiteration,
// danach wird die Wärmebilanz des Menschen ausgewertet.
// ta  Lufttemperatur (°C)          tr   mittlere Strahlungstemperatur (°C)
// vel relative Luftgeschwindigkeit (m/s)  pa Wasserdampf-Partialdruck (Pa)
// clo Bekleidungswiderstand (clo)  met  Energieumsatz (met)  wme äussere Arbeit (met)
// Rückgabe: PMV (−3 kalt … +3 heiss) oder NaN, wenn die Iteration nicht konvergiert.
export function pmv(ta, tr, vel, pa, clo, met, wme = 0) {
  const icl = 0.155 * clo;  // m²K/W  Bekleidungswiderstand in SI
  const m = met * 58.15;    // W/m²   Energieumsatz
  const mw = m - wme * 58.15;

  // Bekleidungsflächenfaktor und erzwungene Konvektion
  const fcl = icl <= 0.078 ? 1 + 1.29 * icl : 1.05 + 0.645 * icl;
  const hcf = 12.1 * Math.sqrt(vel);

  const taa = ta + 273;
  const tra = tr + 273;

  const p1 = icl * fcl;
  const p2 = p1 * 3.96;
  const p3 = p1 * 100;
  const p4 = p1 * taa;
  const p5 = 308.7 - 0.028 * mw + p2 * Math.pow(tra / 100, 4);

  // Startwert nach ISO 7730; xn/xf sind t_cl in 100-K-Einheiten
  const tcla = taa + (35.5 - ta) / (3.5 * (6.45 * icl + 0.1));
  let xn = tcla / 100;
  let xf = tcla / 50;
  let hc = hcf;
  let iterations = 0;

  while (Math.abs(xn - xf) > 0.00015) {
    xf = (xf + xn) / 2;
    const hcn = 2.38 * Math.pow(Math.abs(100 * xf - taa), 0.25);  // freie Konvektion
    hc = hcf > hcn ? hcf : hcn;
    xn = (p5 + p4 * hc - p2 * Math.pow(xf, 4)) / (100 + p3 * hc);
    if (++iterations > 150) return NaN;
  }

  const tcl = 100 * xn - 273;

  const hl1 = 3.05 * 0.001 * (5733 - 6.99 * mw - pa);   // Wasserdampfdiffusion durch die Haut
  const hl2 = mw > 58.15 ? 0.42 * (mw - 58.15) : 0;      // Schweissverdunstung
  const hl3 = 1.7 * 0.00001 * m * (5867 - pa);           // latente Atmung
  const hl4 = 0.0014 * m * (34 - ta);                    // trockene Atmung
  const hl5 = 3.96 * fcl * (Math.pow(xn, 4) - Math.pow(tra / 100, 4));  // Strahlung
  const hl6 = fcl * hc * (tcl - ta);                     // Konvektion

  const ts = 0.303 * Math.exp(-0.036 * m) + 0.028;       // Empfindlichkeitskoeffizient
  return ts * (mw - hl1 - hl2 - hl3 - hl4 - hl5 - hl6);
}

// Vorausgesagter Prozentsatz Unzufriedener (%) aus PMV, EN ISO 7730
export function ppd(pmvValue) {
  return 100 - 95 * Math.exp(-0.03353 * Math.pow(pmvValue, 4) - 0.2179 * Math.pow(pmvValue, 2));
}

// Zustandsgrössen aus T und x berechnen.
// Erkennt Übersättigung (Nebelgebiet, x > x_s): dort gilt φ = 100 %, T_d = T,
// die Enthalpie enthält den Flüssigwasserterm und die Dichte rechnet nur x_s als Dampf.
export function stateFromTX(T, x_gkg, p) {
  const x = x_gkg / 1000;
  const xs = humidityRatio(T, 1.0, p);
  const fog = Number.isFinite(xs) && x > xs;

  const phi = fog ? 1 : relativeHumidity(T, x, p);
  const h = fog ? enthalpyFog(T, x, xs) : enthalpy(T, x);
  const Td = fog ? T : dewPointFromX(x, p);
  const rho = density(T, x, p, fog ? xs : x);
  const pD = fog ? saturationPressure(T) : partialPressure(x, p);
  return { T, x: x_gkg, phi, h, Td, rho, pD, fog };
}
