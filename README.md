# h,x-Diagramm für feuchte Luft

[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blue.svg)](LICENSE)
[![Live-Demo](https://img.shields.io/badge/Live--Demo-git.logicc.ch-00a19a.svg)](https://git.logicc.ch/hx-diagramm/)

Interaktive Web-App zur Darstellung eines Mollier h,x-Diagramms für feuchte Luft. Läuft vollständig im Browser; kein Backend erforderlich.

![Screenshot](docs/screenshot.png)

[Live-Demo](https://git.logicc.ch/hx-diagramm/)

## Features

- **Psychrometrisch korrekt:** Sättigungsdampfdruck nach Magnus-Formel, Luftdruck nach ICAO-Standardatmosphäre
- **Konfigurierbar:** Temperaturbereich, Feuchtebereich und Höhe über Meer frei wählbar
- **Interaktive Zustandspunkte:** Per Klick ins Diagramm setzen, per Drag & Drop verschieben oder numerisch eingeben
- **Prozesslinien:** Automatische Verbindung zwischen Zustandspunkten
- **Vollständige Zustandsberechnung:** Temperatur, relative/absolute Feuchte, Enthalpie, Taupunkt und Dichte
- **Leistungsberechnung:** Massen- oder Volumenstrom eingeben (kg/s, kg/h, m³/s, m³/h); die App berechnet pro Prozessabschnitt Heiz-/Kühlleistung `Q = ṁ·Δh` (kW) und Be-/Entfeuchtungsleistung `ṁ·Δx` (kg/h) samt Gesamtbilanz
- **Behaglichkeitszonen:** Zuschaltbares Komfort-Overlay („behaglich" / „noch behaglich") nach der HSLU-edar-Referenz, ins h,x-Koordinatensystem transformiert
- **Design nach Seven-Air-Vorlage:** Monochromes Liniennetz, Helvetica-Beschriftung, alle Linien bis zum Diagrammrand
- **Responsive:** Auf iPhone/iPad (unterhalb 900 px Breite) gestapeltes, scrollbares Layout mit dem Diagramm zuoberst; Zustandspunkte sind per Touch setz- und verschiebbar

### Dargestellte Grössen

| Element | Beschreibung |
|---|---|
| Sättigungslinie | φ = 100 % |
| Relative Feuchte | φ = 10 %, 20 %, … 90 % |
| Enthalpielinien | Diagonale Linien konstanter Enthalpie h (kJ/kg) |
| Isothermen | Horizontale Linien konstanter Temperatur T (°C) |
| Linien konstanter Feuchte | Vertikale Linien konstanter absoluter Feuchte x (g/kg) |

## Installation

```bash
git clone https://github.com/Raffa3l/hx-diagramm.git
cd hx-diagramm
npm install
npm run dev
```

Die App ist dann unter `http://localhost:5173/hx-diagramm/` erreichbar (Basispfad aus `vite.config.js`).

### Produktionsbuild

```bash
npm run build
npm run preview
```

Der Build wird im Ordner `dist/` abgelegt und kann auf jedem statischen Webserver gehostet werden.

## Konfigurationsparameter

| Parameter | Standardwert | Beschreibung |
|---|---|---|
| Höhe ü. M. | 500 m | Höhe über Meer; bestimmt den barometrischen Luftdruck nach ICAO-Standardatmosphäre |
| T min | −10 °C | Untere Grenze der Temperaturachse |
| T max | 50 °C | Obere Grenze der Temperaturachse |
| x max | 30 g/kg | Obere Grenze der absoluten Feuchte |

Die Höhe über Meer beeinflusst den Luftdruck und damit alle psychrometrischen Berechnungen (Sättigungslinien, Enthalpie, Taupunkt).

## Zustandspunkte

Zustandspunkte können auf zwei Arten erstellt werden:

1. **Klick ins Diagramm:** Punkt wird an der angeklickten Stelle gesetzt
2. **Numerische Eingabe:** Temperatur + relative Feuchte (φ) oder absolute Feuchte (x) eingeben

Jeder Zustandspunkt zeigt:
- Temperatur T (°C)
- Relative Feuchte φ (%)
- Absolute Feuchte x (g/kg)
- Spezifische Enthalpie h (kJ/kg)
- Taupunkttemperatur T_d (°C)
- Dichte ρ (kg/m³)

Punkte können per Drag & Drop verschoben werden. Zwischen aufeinanderfolgenden Punkten werden Prozesslinien gezeichnet.

## Luftstrom & Leistung

Im Panel „Luftstrom & Leistung" kann ein Massenstrom (kg/s oder kg/h) oder ein Volumenstrom (m³/s oder m³/h) eingegeben werden. Für jeden Prozessabschnitt Pᵢ → Pᵢ₊₁ berechnet die App:

| Grösse | Formel | Einheit |
|---|---|---|
| Heiz-/Kühlleistung | `Q = ṁ · Δh` | kW |
| Be-/Entfeuchtungsleistung | `ṁ_W = ṁ · Δx` | kg/h |

Bei mehr als zwei Punkten wird zusätzlich die Gesamtbilanz über die ganze Prozesskette angezeigt.

**Konventionen:** Der Massenstrom ṁ ist auf trockene Luft bezogen (h und x sind pro kg trockene Luft definiert). Ein eingegebener Volumenstrom wird je Abschnitt mit der Dichte und Feuchte am Abschnittsanfang umgerechnet: `ṁ = V̇ · ρ / (1 + x)`.

## Behaglichkeitszonen

Über die Checkbox **„Behaglichkeitszonen anzeigen"** (Panel „Konfiguration") lassen sich zwei Komfortzonen ein- und ausblenden:

| Zone | Darstellung | Eckpunkte (T in °C / φ in %) |
|---|---|---|
| behaglich | gelbgrün, 40 % Deckkraft | (19/38), (17.5/74), (22.5/65), (24/35) |
| noch behaglich | orange, 25 % Deckkraft | (20/20), (17/40), (16/75), (17/85), (21.5/80), (25/60), (27/30), (25.5/20) |

Die Polygone stammen aus der [HSLU-edar-Referenz `comfortTempHum.Rmd`](https://github.com/hslu-ige-laes/edar/blob/master/partDataVis/comfortTempHum.Rmd) (dort in einem T/φ-Plot). In dieser App werden die Kanten linear in (T, φ) abgetastet und über die Psychrometrie φ→x ins h,x-Koordinatensystem transformiert; die Zonenform ist dadurch druckabhängig und passt zu den vorhandenen Zustandspunkten: Liegt ein Punkt in der Zone, ist der Luftzustand behaglich.

## Physikalische Grundlagen

Formeln und Konstanten nach VDI 4670 Blatt 1 bzw. ASHRAE Fundamentals; Sättigungsdampfdruck nach Magnus mit Tetens-Koeffizienten (vgl. VDI 3786 Blatt 4).

- **Sättigungsdampfdruck**: Magnus-Formel (getrennte Koeffizienten für T ≥ 0 °C über Wasser und T < 0 °C über Eis)
- **Barometrischer Druck**: ICAO-Standardatmosphäre: `p = 101325 · (1 − 2.25577·10⁻⁵ · H)^5.25588`
- **Enthalpie (ungesättigt)**: `h = 1.006·T + x·(2501 + 1.86·T)` in kJ/kg trockene Luft
- **Enthalpie (Nebelgebiet, x > x_s)**: `h = 1.006·T + x_s·(2501 + 1.86·T) + (x − x_s)·4.19·T`; nur x_s ist dampfförmig, der Rest flüssig
- **Absolute Feuchte**: `x = 0.622 · pD / (p − pD)` in kg/kg
- **Dichte feuchter Luft**: `ρ = p/(R_d·T_abs) · (1 + x)/(1 + 1.608·x_Dampf)`; im Nebelgebiet mit `x_Dampf = x_s`

Übersättigte Zustandspunkte (im Nebelgebiet, unterhalb der Sättigungslinie) werden mit φ = 100 %, T_d = T gerechnet und in Punktkarte und Tooltip als **„Nebelgebiet (übersättigt)"** gekennzeichnet.

**Bekannte Vereinfachung:** Die gezeichneten Enthalpielinien laufen im Nebelgebiet mit der ungesättigten Formel gerade weiter (wie in der Seven-Air-Vorlage), statt an der Sättigungslinie abzuknicken. Zum Ablesen von h im Nebelgebiet daher die Punktkarten bzw. den Tooltip verwenden; diese rechnen dort korrekt mit dem Flüssigwasserterm.

## Tech-Stack

- [Vite](https://vitejs.dev/): Build-Tool und Entwicklungsserver
- [D3.js](https://d3js.org/) v7: SVG-Rendering und Interaktion
- Vanilla JavaScript (ES Modules); kein Framework

## Inspiration

- Visuelles Layout orientiert sich am h,x-Diagramm der [Seven-Air Gebr. Meyer AG](https://www.seven-air.ch/resources/h-x-Diagramm-540.pdf)
- Psychrometrische Referenz: [d3-mollierhx](https://github.com/hslu-ige-laes/d3-mollierhx) (HSLU)

## Lizenz

MIT
