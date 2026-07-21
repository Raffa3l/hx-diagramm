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
- **Behaglichkeitszonen & Schwülegrenze:** Separat zuschaltbare Overlays, das historische Leusden/Freymark-Feld („behaglich" / „noch behaglich"), ins h,x-Koordinatensystem transformiert, sowie die Schwülegrenze bei x = 11,5 g/kg (siehe „Quellenlage")
- **PMV-Behaglichkeitskategorien:** Normbasiertes Overlay nach EN ISO 7730; die Kategorien I–III aus SN EN 16798-1 werden als Höhenlinien des PMV-Felds über (T, x) berechnet und reagieren live auf Bekleidung, Aktivität, Luftgeschwindigkeit und Strahlungstemperatur
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

Alle Behaglichkeits-Overlays sind im eigenen Panel **„Behaglichkeit"** zusammengefasst. Dort lassen sich zwei Komfortzonen des **Leusden/Freymark-Felds** (Checkbox **„Behaglichkeitszonen anzeigen"**) und die Schwülegrenze (Checkbox **„Schwülegrenze anzeigen"**) unabhängig voneinander ein- und ausblenden:

| Zone | Darstellung | Eckpunkte (T in °C / φ in %) |
|---|---|---|
| behaglich | gelbgrün, 40 % Deckkraft | (19/38), (17.5/74), (22.5/65), (24/35) |
| noch behaglich | orange, 25 % Deckkraft | (20/20), (17/40), (16/75), (17/85), (21.5/80), (25/60), (27/30), (25.5/20) |

Zusätzlich wird die **Schwülegrenze** als senkrechte, gestrichelte Linie bei **x = 11,5 g/kg** dargestellt; rechts davon wird die Luft als schwül empfunden. Die Linie gilt nur für ungesättigte Luft und endet deshalb unten an der Sättigungslinie (φ = 100 %, d.h. am druckabhängigen Taupunkt von 11,5 g/kg, bei 955 mbar ≈ 15,3 °C); darunter beginnt das Nebelgebiet. Bei x max < 11,5 g/kg liegt sie ausserhalb und wird nicht gezeichnet.

### Quellenlage (Stand der Verifikation)

Die Zonen-Eckpunkte stammen aus der [HSLU-edar-Referenz `comfortTempHum.Rmd`](https://github.com/hslu-ige-laes/edar/blob/master/partDataVis/comfortTempHum.Rmd) (dort in einem T/φ-Plot; die Kanten werden hier linear in (T, φ) abgetastet und über φ→x ins h,x-System transformiert, wodurch die Zonenform druckabhängig wird). 

Form, Zweiteilung und Terminologie („behaglich" / „noch behaglich") entsprechen klar erkennbar dem in der deutschsprachigen Lüftungs-/Klimatechnik historisch etablierten **Leusden/Freymark-Feld**:

> Leusden, F. v.; Freymark, H.: *Darstellung der Raumbehaglichkeit für den praktischen Gebrauch.* Gesundheits-Ingenieur 72 (1951), Heft 16, S. 271–273.

Diese Originalpublikation von 1951 ist nicht frei online verfügbar; die **exakten Eckpunkte konnten daher nicht Ziffer für Ziffer gegen das Original verifiziert werden** – nur Form und Grössenordnung sind plausibilisiert (Wikipedia nennt für Behaglichkeit allgemein 18–24 °C / 35–75 % rF / x 5–12 g/kg, was sich mit der inneren „behaglich"-Zone von 19–24 °C / 35–74 % rF deckt, ohne Leusden/Freymark namentlich zu nennen oder zwei Zonen zu unterscheiden).

Der dargestellte feste Wert **x = 11,5 g/kg** für die Schwülegrenze stützt sich auf die deutsche Arbeitsschutzliteratur (BAuA, ASR A3.5) und ist nach aktuellem Stand der schweizerischen Fachnormung als vereinfachendes Konzept zu betrachten, nicht als normkonformer Schweizer Referenzwert.

**Einordnung:** EN ISO 7730 und ASHRAE 55 sind die heute massgeblichen Normen für thermische Behaglichkeit, arbeiten aber methodisch grundlegend anders (PMV/PPD-Index nach Fanger, unter Einbezug von Bekleidung, Aktivität, Luftgeschwindigkeit und Strahlungstemperatur; ASHRAE 55 zusätzlich mit einem adaptiven Komfortmodell für frei belüftete Räume). Für Schweizer Projekte unmittelbar anwendbar ist SN EN 16798-1 mit nationalem Anhang (SIA 382.711), die sich für das Schwüleempfinden auf den vorausgesagten Prozentsatz der thermischen Akzeptanz (PTA) stützt und unter Berufung auf Kleber et al. (2018) explizit festhält, dass keine feste, temperaturunabhängige Schwülegrenze existiert. Keine dieser Normen definiert eine einfache T/x-Zone im Mollier-Diagramm.

## PMV-Behaglichkeitskategorien (EN ISO 7730 / SN EN 16798-1)

Als normbasierte Ergänzung zum historischen Leusden/Freymark-Feld lässt sich im Panel „Behaglichkeit" unter dem aufklappbaren Feld **„Behaglichkeit nach EN ISO 7730 (PMV)"** ein Overlay der Behaglichkeitskategorien einblenden. Anders als das Leusden/Freymark-Feld sind das **keine festen Eckpunkte**, sondern Höhenlinien des PMV-Felds: Für jeden Gitterpunkt (T, x) wird der PMV nach dem Iterationsverfahren aus EN ISO 7730 Anhang D berechnet und anschliessend konturiert.

| Kategorie (SN EN 16798-1) | Bedingung | PPD |
|---|---|---|
| I | \|PMV\| ≤ 0,2 | < 6 % |
| II | \|PMV\| ≤ 0,5 | < 10 % |
| III | \|PMV\| ≤ 0,7 | < 15 % |

Ein Band |PMV| ≤ Grenzwert entsteht aus den beiden Konturen −Grenzwert und +Grenzwert, die per `fill-rule="evenodd"` zu einem Ring kombiniert werden.

### Parameter

| Parameter | Standardwert | Beschreibung |
|---|---|---|
| Bekleidung | 0,5 clo | leichte Sommerbekleidung; 1,0 clo entspricht Winterbekleidung |
| Aktivität | 1,2 met | sitzende, entspannte Tätigkeit |
| Luftgeschwindigkeit | 0,1 m/s | relative Luftgeschwindigkeit (ruhende Luft) |
| t_r | = T-Achse | mittlere Strahlungstemperatur; leer bedeutet: t_r folgt der Lufttemperatur der Y-Achse (siehe unten) |

Weil das Ergebnis vollständig von diesen vier Grössen abhängt, werden sie direkt im Diagramm unter der Zonenbeschriftung mitgeführt.

**Wichtig zum Verständnis:** Die PMV-Zonen werden für **jeden Punkt des Diagramms** berechnet, nicht für einen gesetzten Zustandspunkt. Zustandspunkte gehen in die Berechnung nicht ein — löscht man sie, bleiben die Zonen unverändert.

Deshalb bedeutet ein leeres t_r-Feld *nicht* „t_r = Temperatur meines Punktes", sondern: t_r folgt der Y-Achse und wird für jede Diagrammzeile neu gesetzt (Zeile 16 °C → t_r = 16 °C, Zeile 30 °C → t_r = 30 °C). Ein fester Wert von z. B. 20 °C gilt dagegen im ganzen Diagramm. Beide Einstellungen stimmen deshalb nur in der einen Zeile T = 20 °C überein — und dort liegt in der Regel gerade keine Zonengrenze:

| Zeile T | leer: t_r / PMV | t_r = 20 °C: t_r / PMV |
|---|---|---|
| 20 °C | 20 °C / −0,46 | 20 °C / −0,46 ← nur hier gleich |
| 24 °C | 24 °C / +0,38 | 20 °C / −0,05 |
| 30 °C | 30 °C / +1,64 | 20 °C / +0,47 |

(clo 2, met 0,8, v 0 m/s, x = 7,71 g/kg)

Ein fest vorgegebenes t_r **verbreitert** das Band zusätzlich: Bei t_r = T ändern sich Luft- und Strahlungstemperatur pro Achsenschritt gemeinsam, bei festem t_r nur die Luft — die Empfindlichkeit dPMV/dT halbiert sich, das Band wird rund doppelt so breit (Kategorie II im Beispiel: 4,8 K statt 10,6 K). Bei v = 0 m/s ist der Faktor mit 2,2 sogar etwas grösser, weil ohne erzwungene Konvektion der Strahlungsanteil überwiegt.

**Zur Strahlungstemperatur:** t_r geht etwa gleich stark in den PMV ein wie die Lufttemperatur — das ist der Operativtemperatur-Effekt (t_op ≈ (t_a + t_r)/2). Gemessen an der Implementierung beträgt die Verschiebung der Neutraltemperatur **1,01 K je K**: Bei t_r = 20 °C liegt sie bei 30,6 °C, bei t_r = 25 °C bei 25,5 °C, bei t_r = 30 °C bei 20,9 °C. Ein niedrig eingestelltes t_r schiebt die Zonen also weit nach oben; bei t_r = 2 °C läge die Neutraltemperatur bereits bei 44,3 °C. Das ist physikalisch korrekt, sieht aber nach einem Fehler aus — die Eingabe ist deshalb um 400 ms entprellt, damit Zwischenstände beim Tippen (die „2" auf dem Weg zu „20") nicht gerendert werden.

### Darstellung und Einordnung

Das Band verläuft **nahezu waagrecht mit leichtem Gefälle nach rechts**: Bei 0,5 clo und 1,2 met liegt die Neutraltemperatur (PMV = 0) bei x = 2 g/kg um 25,7 °C und bei x = 14 g/kg um 24,3 °C – über 12 g/kg Feuchteänderung also nur rund 1,4 K. Der Feuchteeinfluss auf das Behaglichkeitsempfinden ist damit deutlich schwächer als der Temperatureinfluss.

Genau darin liegt der Unterschied zur senkrechten Schwülegrenze bei x = 11,5 g/kg: Blendet man beide Overlays gleichzeitig ein, kreuzen sie sich fast rechtwinklig. Das macht sichtbar, warum ein fester, temperaturunabhängiger x-Grenzwert nicht dem heutigen Normenverständnis entspricht.

Die PMV-Zonen sind im Nebelgebiet nicht definiert und werden deshalb an der Sättigungslinie abgeschnitten.

**Verifikation:** Die Implementierung ist gegen die Referenzfälle aus EN ISO 7730 Tabelle D.1 geprüft (grösste Abweichung 0,007 PMV). Die Neutraltemperaturen von ≈ 25,5 °C bei 0,5 clo und ≈ 22 °C bei 1,0 clo entsprechen den in der Fachliteratur üblichen Werten.

## Physikalische Grundlagen

Formeln und Konstanten nach VDI 4670 Blatt 1 bzw. ASHRAE Fundamentals; Sättigungsdampfdruck nach Magnus mit Tetens-Koeffizienten (vgl. VDI 3786 Blatt 4).

- **Sättigungsdampfdruck**: Magnus-Formel (getrennte Koeffizienten für T ≥ 0 °C über Wasser und T < 0 °C über Eis)
- **Barometrischer Druck**: ICAO-Standardatmosphäre: `p = 101325 · (1 − 2.25577·10⁻⁵ · H)^5.25588`
- **Enthalpie (ungesättigt)**: `h = 1.006·T + x·(2501 + 1.86·T)` in kJ/kg trockene Luft
- **Enthalpie (Nebelgebiet, x > x_s)**: `h = 1.006·T + x_s·(2501 + 1.86·T) + (x − x_s)·4.19·T`; nur x_s ist dampfförmig, der Rest flüssig
- **Absolute Feuchte**: `x = 0.622 · pD / (p − pD)` in kg/kg
- **PMV/PPD**: Iterationsverfahren nach EN ISO 7730 Anhang D (Fixpunktiteration für die Bekleidungsoberflächentemperatur, danach Wärmebilanz aus Diffusion, Schwitzen, Atmung, Strahlung und Konvektion)
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
