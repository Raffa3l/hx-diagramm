// Psychrometrische Berechnungen für feuchte Luft.
// Formeln und Konstanten nach VDI 4670 Blatt 1 bzw. ASHRAE Fundamentals (Kap. 1, Psychrometrics);
// Sättigungsdampfdruck nach Magnus mit Tetens-Koeffizienten (vgl. VDI 3786 Blatt 4).
// Einheiten: T in °C, p in Pa, x in kg/kg trockene Luft, h in kJ/kg trockene Luft.

// Konstanten (SI)
const R_DRY = 287.05;  // J/(kg·K)  spezifische Gaskonstante trockene Luft
const EPS = 0.622;     // –         Verhältnis der Gaskonstanten R_d/R_v (genauer 0.62198)
const RV_RD = 1.608;   // –         R_v/R_d = 1/EPS
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
