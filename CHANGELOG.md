# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

## [1.2.1] – 2026-07-18

### Behoben
- **Nebelgebiet (Übersättigung, x > x_s) physikalisch korrekt:** Zustandspunkte im
  Nebelgebiet zeigten φ > 100 %, einen Taupunkt über der Lufttemperatur und eine
  zu hohe Enthalpie (Flüssigwasserterm fehlte; bei 5 °C / 10 g/kg z.B. 30.1 statt
  ≈ 19.5 kJ/kg – der Fehler floss auch in die Leistungsberechnung ein).
  Jetzt gilt dort nach VDI 4670: h = cp_L·T + x_s·(r₀ + cp_D·T) + (x − x_s)·cp_W·T,
  φ = 100 %, T_d = T, p_D = p_s; die Dichte rechnet nur x_s als Dampf
  (Tropfenvolumen vernachlässigt). Übersättigte Punkte werden in Punktkarte und
  Tooltip als „Nebelgebiet (übersättigt)" gekennzeichnet.

### Geändert
- Psychrometrie-Konstanten (R_d, cp-Werte, r₀, R_d/R_v) als benannte Konstanten
  mit Quellenangaben (VDI 4670, ASHRAE Fundamentals, Magnus/Tetens nach VDI 3786)
  statt verstreuter Zahlenliterale.
- Fokus-Schatten der Eingabefelder an die Petrol-Akzentfarbe angepasst (war noch blau).
- Leere-Zustand-Hinweise vereinheitlicht (gemeinsame CSS-Klasse statt Inline-Style).

### Entfernt
- Ungenutzte Funktionen `stateFromTPhi` und `dewPoint` (toter Code; die UI rechnet
  φ-Eingaben über `humidityRatio` in x um und nutzt `stateFromTX`).

## [1.2.0] – 2026-07-18

### Hinzugefügt
- **Behaglichkeitszonen:** Zuschaltbares Komfort-Overlay nach der HSLU-edar-Referenz
  (`comfortTempHum.Rmd`): Zone „behaglich" (gelbgrün, 40 % Deckkraft) und
  „noch behaglich" (orange, 25 % Deckkraft) mit den Original-Polygonen in (T, φ).
  Die Kanten werden linear in (T, φ) abgetastet und über φ→x ins
  h,x-Koordinatensystem transformiert (druckabhängige Form). Ein-/Ausblenden
  über die Checkbox „Behaglichkeitszonen anzeigen" wirkt sofort, ohne
  „Diagramm aktualisieren"; die Einstellung übersteht Konfigurationsänderungen.

## [1.1.0] – 2026-07-18

### Hinzugefügt
- **Luftstrom & Leistung:** Neues Sidebar-Panel zur Eingabe von Massenstrom
  (kg/s, kg/h) oder Volumenstrom (m³/s, m³/h). Pro Prozessabschnitt werden
  Heiz-/Kühlleistung `Q = ṁ·Δh` (kW) und Be-/Entfeuchtungsleistung `ṁ·Δx` (kg/h)
  berechnet, bei mehr als zwei Punkten zusätzlich die Gesamtbilanz.
  ṁ ist auf trockene Luft bezogen; V̇ wird je Abschnitt mit `ṁ = V̇·ρ/(1+x)`
  am Abschnittsanfang umgerechnet.
- Diagonale Beschriftung „Spezifische Enthalpie h in kJ/kg" entlang der
  Enthalpielinien sowie Überschrift „Relative Feuchtigkeit φ in %" über dem
  oberen Rand (wie Seven-Air-Vorlage).

### Geändert
- **Monochromes Design nach Seven-Air-Vorlage:** Alle Diagrammlinien
  (φ-Linien, Enthalpielinien, Sättigungslinie) jetzt schwarz/grau statt farbig;
  Nebelgebiet dezent grau schattiert; Diagrammschrift Helvetica/Arial;
  UI-Akzentfarbe Petrol (#00a19a) statt Blau. Zustandspunkte und Prozesslinien
  bleiben als interaktive Elemente rot.
- Achsenbeschriftung „Temperatur t in °C" (Kleinbuchstabe t) und Titelzeile
  „m.ü.M." entsprechend der Vorlage.
- Enthalpielinien durchgehend statt teilweise gestrichelt.

### Behoben
- **Linien enden exakt am Diagrammrand:** Enthalpie- und φ-Linien stoppten
  bis zu einem Abtastschritt vor dem Rahmen; Eintritts- und Austrittspunkte
  werden jetzt exakt berechnet (Enthalpielinien analytisch, φ- und
  Sättigungslinie durch Interpolation am rechten Rand und exakte Endpunkte
  bei T min/T max).

## [1.0.2] – 2026-07-05

### Geändert
- **Beschriftungen ausserhalb des Diagramms** (wie Seven-Air-Vorlage): Enthalpie-Werte
  in eigener Spalte links der Temperaturachse (mit Überschrift „h in kJ/kg") bzw.
  rotiert über dem oberen Rand; φ-Werte rechts neben bzw. über dem Rahmen;
  „φ = 100 %" am Austrittspunkt der Sättigungslinie ausserhalb des Rahmens.
- Diagrammränder vergrössert, um Platz für die aussenliegenden Beschriftungen zu schaffen.

### Behoben
- Nebelgebiet-Schattierung reicht jetzt bis zum rechten Rand, wenn die
  Sättigungslinie oben austritt (der Streifen rechts davon ist ebenfalls Nebelgebiet).

## [1.0.1] – 2026-07-05

### Behoben
- **Drag & Drop:** Beim Verschieben eines Zustandspunkts sprang die x-Koordinate
  auf 0. `d3.drag()` verwendete das Datum (mit `d.x` in g/kg) als Gestenursprung;
  jetzt wird ein explizites `subject` in Bildschirmkoordinaten gesetzt.
- **Höhe 0 m:** Die Eingabe von 0 m ü. M. (Meereshöhe) fiel wegen `parseFloat(...) || 500`
  auf 500 m zurück; gleiches Problem bei T min = 0 °C. Eingaben werden jetzt mit
  `Number.isFinite` geprüft – 0 ist ein gültiger Wert.
- **Veraltete Punktwerte:** Nach einer Höhen-/Druckänderung wurden φ, Taupunkt und
  Dichte bestehender Zustandspunkte nicht neu berechnet. `update()` rechnet jetzt
  alle Punkte mit dem neuen Druck nach.
- **Sättigungslinie:** Endet jetzt sauber interpoliert am rechten Diagrammrand statt
  als künstliches vertikales Segment (Punkte wurden zuvor auf x max geklemmt).
- **Favicon-404:** Inline-SVG-Favicon ergänzt, der Konsolenfehler beim Laden entfällt.

### Geändert
- Eingabe-Validierung ergänzt: T max ≤ T min wird auf T min + 10 K geklemmt,
  x max ≥ 1 g/kg erzwungen, unendliche Feuchte (φ-Eingabe bei sehr hohen
  Temperaturen) wird abgefangen.
- Meta-Description in `index.html` ergänzt.

### Entfernt
- Toter Code in `drawSaturationCurve` (`areaPoints`, `fogArea`) sowie ungenutzte
  Imports und Destrukturierungen.
- Obsoleter GitHub-Actions-Workflow `.github/workflows/deploy.yml` – GitHub Pages
  serviert die Quelldateien direkt vom Branch (siehe CLAUDE.md), der Workflow
  deployte ins Leere.

## [1.0.0] – 2026-06-21

### Hinzugefügt
- Erste Version: interaktives Mollier h,x-Diagramm für feuchte Luft.
- Konfigurierbarer Temperatur- und Feuchtebereich, Höhe über Meer
  (Luftdruck nach ICAO-Standardatmosphäre).
- Sättigungslinie, Linien konstanter relativer Feuchte (10–90 %),
  Enthalpielinien, Isothermen, Nebelgebiet-Schattierung.
- Zustandspunkte per Klick, numerischer Eingabe (T + φ oder T + x) und
  Drag & Drop; Prozesslinien zwischen aufeinanderfolgenden Punkten.
- Vollständige Zustandsberechnung: T, φ, x, h, Taupunkt, Dichte.
- Deployment auf GitHub Pages, lauffähig ohne Build dank Import Map (jsdelivr-CDN).
