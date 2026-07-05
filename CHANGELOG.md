# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

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
