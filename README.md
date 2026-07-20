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
- **Behaglichkeitszonen & Schwülegrenze:** Separat zuschaltbare Overlays – das historische Leusden/Freymark-Feld („behaglich" / „noch behaglich"), ins h,x-Koordinatensystem transformiert, sowie die Schwülegrenze bei x = 11,5 g/kg (siehe „Quellenlage" für Herkunft und Verifikationsstand)
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

## Behaglichkeitszonen & Schwülegrenze (Leusden/Freymark-Feld)

Im Panel „Konfiguration" lassen sich zwei Komfortzonen des **Leusden/Freymark-Felds** (Checkbox **„Behaglichkeitszonen anzeigen"**) und die Schwülegrenze (Checkbox **„Schwülegrenze anzeigen"**) unabhängig voneinander ein- und ausblenden:

| Zone | Darstellung | Eckpunkte (T in °C / φ in %) |
|---|---|---|
| behaglich | gelbgrün, 40 % Deckkraft | (19/38), (17.5/74), (22.5/65), (24/35) |
| noch behaglich | orange, 25 % Deckkraft | (20/20), (17/40), (16/75), (17/85), (21.5/80), (25/60), (27/30), (25.5/20) |

Zusätzlich wird die **Schwülegrenze** als senkrechte, gestrichelte Linie bei **x = 11,5 g/kg** dargestellt; rechts davon wird die Luft als schwül empfunden. Die Linie gilt nur für ungesättigte Luft und endet deshalb unten an der Sättigungslinie (φ = 100 %, d.h. am druckabhängigen Taupunkt von 11,5 g/kg, bei 955 mbar ≈ 15,3 °C); darunter beginnt das Nebelgebiet. Bei x max < 11,5 g/kg liegt sie ausserhalb und wird nicht gezeichnet.

### Quellenlage (Stand der Verifikation)

Die Zonen-Eckpunkte stammen wörtlich aus der [HSLU-edar-Referenz `comfortTempHum.Rmd`](https://github.com/hslu-ige-laes/edar/blob/master/partDataVis/comfortTempHum.Rmd) (dort in einem T/φ-Plot; die Kanten werden hier linear in (T, φ) abgetastet und über φ→x ins h,x-System transformiert, wodurch die Zonenform druckabhängig wird). **Diese Quelle selbst nennt jedoch keine Norm, keinen Autor und keine Literaturangabe** – weder im Code noch im begleitenden Kursmaterial noch im zugehörigen R-Paket `redutils`; die Eckpunkte stehen dort als unbelegte Zahlenwerte.

Form, Zweiteilung und Terminologie („behaglich" / „noch behaglich") entsprechen klar erkennbar dem in der deutschsprachigen Lüftungs-/Klimatechnik historisch etablierten **Leusden/Freymark-Feld**:

> Leusden, F. v.; Freymark, H.: *Darstellung der Raumbehaglichkeit für den praktischen Gebrauch.* Gesundheits-Ingenieur 72 (1951), Heft 16, S. 271–273.

Diese Originalpublikation von 1951 ist nicht frei online verfügbar; die **exakten Eckpunkte konnten daher nicht Ziffer für Ziffer gegen das Original verifiziert werden** – nur Form und Grössenordnung sind plausibilisiert (Wikipedia nennt für Behaglichkeit allgemein 18–24 °C / 35–75 % rF / x 5–12 g/kg, was sich mit der inneren „behaglich"-Zone von 19–24 °C / 35–74 % rF deckt, ohne Leusden/Freymark namentlich zu nennen oder zwei Zonen zu unterscheiden).

**Abgleich mit Recknagel – Taschenbuch für Heizung + Klimatechnik, 77. Auflage (2015/2016):** Eine gezielte Volltextsuche in dieser umfassenden, aktuellen deutschsprachigen Fachreferenz ergab **keinen einzigen Treffer** für „Leusden", „Freymark" oder „Behaglichkeitsfeld". Das komplette Kapitel „1.2.2 Thermische Behaglichkeit" (S. 145–153) arbeitet stattdessen ausschliesslich mit zwei anderen Methoden: dem adaptiven Modell nach **DIN EN 15251** (behagliche operative Temperatur vs. gleitender Aussentemperatur-Mittelwert, für frei belüftete Gebäude) und dem **PMV/PPD-Index nach DIN EN ISO 7730** (bei fixer Luftfeuchte von 50 %, keine T/Feuchte-Zone). Der Recknagel merkt zudem an, dass **DIN 1946-2** – die ältere Norm, die historisch das klassische Leusden/Freymark-Feld enthielt – durch DIN EN 13779 abgelöst wurde. Das Leusden/Freymark-Feld ist damit ein **historisches, in der aktuellen Fachnorm-Generation nicht mehr weitergeführtes** Konzept.

Der Wert **x = 11,5 g/kg** für die Schwülegrenze ist unabhängig über die deutsche Bundesanstalt für Arbeitsschutz und Arbeitsmedizin (BAuA) belegt; im Recknagel kommt der Begriff „Schwülegrenze" nur zweimal vor, ohne den Wert 11,5 g/kg zu nennen (einmal ohne Zahl, einmal mit 14,3 g/kg im Sonderkontext Schwimmhallenluft).

**Einordnung:** EN ISO 7730 und ASHRAE 55 sind die heute massgeblichen Normen für thermische Behaglichkeit, arbeiten aber methodisch grundlegend anders (PMV/PPD-Index nach Fanger, unter Einbezug von Bekleidung, Aktivität, Luftgeschwindigkeit und Strahlungstemperatur) und definieren keine einfache T/x-Zone im Mollier-Diagramm. Beide Overlays dieser App zeigen das **Leusden/Freymark-Feld als historisches Orientierungskonzept der klassischen HLK-Fachliteratur**, nicht als normkonformen Nachweis nach heutigem ISO 7730/ASHRAE 55/DIN EN 15251.

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
