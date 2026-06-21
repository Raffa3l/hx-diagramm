// Barometrischer Druck aus Höhe (ICAO Standardatmosphäre)
// altitude in m, Rückgabe in Pa
export function pressureFromAltitude(altitude) {
  return 101325 * Math.pow(1 - 2.25577e-5 * altitude, 5.25588);
}

// Sättigungsdampfdruck (Magnus-Formel)
// T in °C, Rückgabe in Pa
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
  return 0.622 * pD / (p - pD);
}

// Relative Feuchte φ aus T und x
// T in °C, x in kg/kg, p in Pa, Rückgabe 0..1+
export function relativeHumidity(T, x, p) {
  const ps = saturationPressure(T);
  if (ps <= 0) return 0;
  const pD = x * p / (0.622 + x);
  return pD / ps;
}

// Spezifische Enthalpie (kJ/kg trockene Luft)
// T in °C, x in kg/kg
export function enthalpy(T, x) {
  return 1.006 * T + x * (2501 + 1.86 * T);
}

// Temperatur aus Enthalpie und x
// h in kJ/kg, x in kg/kg, Rückgabe in °C
export function temperatureFromEnthalpy(h, x) {
  return (h - 2501 * x) / (1.006 + 1.86 * x);
}

// Taupunkttemperatur
// T in °C, phi 0..1, Rückgabe in °C
export function dewPoint(T, phi) {
  if (phi <= 0) return -273.15;
  const ps = saturationPressure(T);
  const pD = phi * ps;
  return dewPointFromPartialPressure(pD);
}

// Taupunkt aus Partialdruck
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
  const pD = x * p / (0.622 + x);
  return dewPointFromPartialPressure(pD);
}

// Dichte feuchter Luft (kg/m³)
// T in °C, x in kg/kg, p in Pa
export function density(T, x, p) {
  const Tabs = T + 273.15;
  return p / (287.05 * Tabs) * (1 + x) / (1 + 1.608 * x);
}

// Partialdruck des Wasserdampfes (Pa)
// x in kg/kg, p in Pa
export function partialPressure(x, p) {
  return x * p / (0.622 + x);
}

// Zustandsgrössen aus T und x berechnen
export function stateFromTX(T, x_gkg, p) {
  const x = x_gkg / 1000;
  const phi = relativeHumidity(T, x, p);
  const h = enthalpy(T, x);
  const Td = dewPointFromX(x, p);
  const rho = density(T, x, p);
  const pD = partialPressure(x, p);
  return { T, x: x_gkg, phi, h, Td, rho, pD };
}

// Zustandsgrössen aus T und φ berechnen
export function stateFromTPhi(T, phi, p) {
  const x = humidityRatio(T, phi, p);
  const x_gkg = x * 1000;
  const h = enthalpy(T, x);
  const Td = dewPoint(T, phi);
  const rho = density(T, x, p);
  const pD = partialPressure(x, p);
  return { T, x: x_gkg, phi, h, Td, rho, pD };
}
