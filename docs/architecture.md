---
title: Architektur
nav_order: 2
---

# Wohnraum-Partnerschaften — Algorithmus-Architektur (Kurzübersicht)

## Datenpfad

```
20FLOW7 Excel-Export
  ↓
ExcelDataSource  (data_source/excel_source.py)
  ↓  parst & normalisiert alle Spalten in-memory
DataSource-Interface  (data_source/base.py)  ← Protocol / Dependency Injection
  ↓
Algorithm Pipeline  (algorithm/pipeline.py)
  ↓
FastAPI Endpoints  (main.py)  →  JSON
```

Die `DataSource`-Abstraktion erlaubt einen späteren Wechsel von Excel auf Appwrite ohne Änderungen an der Algorithmus-Schicht.

---

## Algorithmus-Pipeline (4 Stufen)

### Stufe 0 — Preprocessing  `algorithm/preprocessing.py`

| Schritt | Beschreibung |
|---------|-------------|
| Reverse-Coding | Items mit negativer Polung werden gespiegelt |
| Scale-Mittelwert | Itemgruppen werden gemittelt |
| Normalisierung | Alle Werte auf [0, 1] skaliert |

---

### Stufe 1 — Hard Constraints  `algorithm/constraints.py`

Binärer Filter — ein Paar wird eliminiert, sobald **eine** Bedingung nicht erfüllt ist.

| Constraint | Logik |
|------------|-------|
| Budget ? | Überlappung [min, max] beider Personen |
| Standort | Haversine-Distanz ≤ Radius |
| Rauchen | Nichtraucher + kein_raucher_toleriert → ausgeschlossen |
| Haustiere | Unverträgliche Tierarten |
| Einzugsdatum ? | Zeitfenster müssen sich überschneiden |
| Geschlecht | Ausschlussliste (gender_exclude) bidirektional |
| Alter | Altersbereichs-Ausschluss (age_exclude, Liste von Tupeln) |
| Kinder | has_children vs. children_exclude |

---

### Stufe 2 — Soft Score  `algorithm/scoring.py`

Sieben Komponenten, gewichtete Summe (Summe = 1,0).
Fehlende Komponenten werden herausgewichtet (Renormalisierung).

| Komponente | Gewicht? | Strategie | Metrik |
|------------|---------|-----------|--------|
| **personality** | 0,15 | Ähnlichkeit | Gewichteter Manhattan auf ClaVis CORE |
| **motives** | 0,15 | Ähnlichkeit | Gaussian σ=0,20 auf Bindung / Leistung / Gestaltung |
| **values** | 0,15 | Ähnlichkeit | Gaussian σ=0,20 auf Autoritarismus, SDO, Closed Mindset |
| **wellbeing** | 0,10 | Ähnlichkeit | Gaussian auf Stress / Resilienz / Einsamkeit |
| **expectation** | 0,20 | Asymmetrischer Fit | min(A→B-Fit, B→A-Fit) für Sauberkeit, Lärm, Besuch |
| **lifestyle** | 0,10 | Ähnlichkeit | Lineare Likert-Ähnlichkeit: Gemeinschaft, Teilen, Unterstützung |
| **complementary** | 0,15 | Komplementarität | Tagesrhythmus-Kompatibilitätsmatrix |

<!-- **Spezialregeln (Wellbeing):**
- Einsamkeit-Boost: beide ≥ 0,63 → Ähnlichkeitswert ×1,5 (cap 1,0)-->
- Resilienz-Bonus: beide ≥ 0,80 → Ähnlichkeitswert ×1,2 (cap 1,0)

**ClaVis-Dimension-Gewichte (Personality):**
- Stimulation (E/I) und Sicherheit (J/P) → Gewicht 2,0
- S, A, O, P → Gewicht 1,0

---

### Stufe 3 — Risk Layer  `algorithm/scoring.py` › `compute_risk_flag()`

Berechnung **pro Person**, strikt getrennt vom Soft Score.
Risk Flags werden dem Match-Partner **niemals** gezeigt.

| Signal | Primäres Yellow | Primäres Red |
|--------|----------------|--------------|
| Aggression | ≥ 0,60 | ≥ 0,80 |
| Neurotizismus | ≥ 0,65 | ≥ 0,85 |
| Stress | ≥ 0,70 | ≥ 0,90 |
| Resilienz (niedrig) | ≤ 0,30 | ≤ 0,15 |

**Kombinierte Eskalation:**
- Extremes Closed Mindset (≥ 0,80) allein → Yellow
- Extremes Closed Mindset + bereits Yellow/Red → Red
- Extremes Gestaltungsmotiv (≥ 0,90) allein → Yellow
- Extremes Gestaltungsmotiv + bereits Yellow/Red → Red

**Ampel-Konsequenzen:**
- 🟢 Green: normales Matching
- 🟡 Yellow: Match wird gezeigt, aber ans Ende sortiert
- 🔴 Red: keine Matches angezeigt?

---

### Stufe 4 — Ranking & Erklärung  `algorithm/pipeline.py`

```
Score-Bands:
  ≥ 0,80 → "sehr_passend"
  ≥ 0,65 → "gut_passend"
  ≥ 0,50 → "maessig_passend"
   < 0,50 → nicht angezeigt

Sortierung:
  Grüne Kandidaten (nach Score absteigend)
  → Gelbe Kandidaten (nach Score absteigend)
  → Top-N abschneiden
```

**Erklärung (nutzerseitig):**
- Stärken: Top-3-Komponenten mit Ähnlichkeit ≥ 0,75
- Hinweise: Bottom-2-Komponenten mit Ähnlichkeit < 0,55
- Neutrale, nicht-stigmatisierende deutsche Formulierungen
- Pflicht-Disclaimer: *"Eine Empfehlung, keine Verpflichtung — treffen Sie sich persönlich, bevor Sie eine Entscheidung treffen."*

---

## Feature-Übersicht

### Soft Score — 7 Komponenten

| Gruppe | Instrument / Skala | Einzelne Features | Matching-Strategie | Gewicht |
|--------|--------------------|-------------------|--------------------|---------|
| **Persönlichkeit** | ClaVis CORE | Stimulation (E/I), Sicherheit (J/P), S, A, O, P | Ähnlichkeit — gewichteter Manhattan | 15 % |
| **Motive** | ClaVis MOTIVES | Bindung, Leistung, Gestaltung | Ähnlichkeit — Gaussian σ=0,20 | 15 % |
| **Werte** | KSA-3, KSDO-3, Closed Mindset | Autoritarismus (pa1–pa4), Soziale Dominanz (pd1–pd3), Offenheit (cm1–cm3) | Ähnlichkeit — Gaussian σ=0,20 | 15 % |
| **Wohlbefinden** | PSS-10, RS-13, UCLA | Stress (s1–s5), Resilienz (r1–r5), Einsamkeit (e1–e6) | Ähnlichkeit — Gaussian + Bonus¹ | 10 % |
| **Erwartungen** | Eigene Items | Sauberkeit, Lärmpegel, Besuchshäufigkeit | Asymmetrischer Fit — min(A→B, B→A) | 20 % |
| **Lebensstil** | Eigene Items | Gemeinschaft, Teilen, gegenseitige Unterstützung | Ähnlichkeit — lineare Likert-Ähnlichkeit | 10 % |
| **Tagesrhythmus** | Eigene Items | Tagesrhythmus-Typ (Frühaufsteher / Nachtmensch / …) | Komplementarität — Kompatibilitätsmatrix | 15 % |

¹ Resilienz-Bonus ×1,2 wenn beide ≥ 0,80

---

### Hard Constraints — Ausschlusskriterien

| Kriterium | Typ | Logik |
|-----------|-----|-------|
| Budget | Numerisch | Budgetbereiche beider Personen müssen sich überschneiden |
| Standort | Geo | Haversine-Distanz ≤ eingestellter Radius |
| Rauchen | Enum | Nichtraucher inkompatibel mit Raucher ohne Toleranz |
| Haustiere | Liste | Unverträgliche Tierarten werden ausgeschlossen |
| Einzugsdatum | Datum | Zeitfenster müssen sich überschneiden |
| Geschlecht | Ausschlussliste | gender_exclude bidirektional geprüft |
| Alter | Bereichsliste | age_exclude: Liste von (min, max)-Tupeln |
| Kinder | Boolean | has_children vs. children_exclude |

---

### Risk Layer — Ampelsystem (nicht im Soft Score)

| Signal | Instrument | Items | 🟡 Yellow ab | 🔴 Red ab |
|--------|-----------|-------|-------------|---------|
| Aggression | Eigene Items | ga1–ga3 | ≥ 0,60 | ≥ 0,80 |
| Neurotizismus | Eigene Items | gn1–gn3 | ≥ 0,65 | ≥ 0,85 |
| Stress? | PSS-10 | s1–s5 | ≥ 0,70 | ≥ 0,90 |
| Resilienz (niedrig)? | RS-13 | r1–r5 | ≤ 0,30 | ≤ 0,15 |
| Closed Mindset (extrem) | Eigene Items | cm1–cm3 | ≥ 0,80 (allein) | + weiteres Yellow/Red |
| Gestaltungsmotiv (extrem) | ClaVis MOTIVES | Gestaltung-gesamt | ≥ 0,90 (allein) | + weiteres Yellow/Red |

---

## Konfiguration  `config.yaml`

Alle Gewichte, Schwellenwerte und Spalten-Mappings sind versioniert in `config.yaml` (aktuell v0.7.0).
Der Algorithmus-Code liest ausschließlich über `algorithm/config.py` daraus — kein Hardcoding.

```
config.yaml
  ├─ version
  ├─ soft_score_weights         # Komponentengewichte
  ├─ gaussian_sigmas            # σ pro Feature-Gruppe
  ├─ wellbeing_config           # Boost/Bonus-Parameter
  ├─ clavis_dimension_weights   # E/I, J/P doppelt gewichtet
  ├─ risk_thresholds            # Yellow/Red pro Risiko-Feature
  ├─ rhythm_compatibility       # Tagesrhythmus-Matrix
  ├─ scales                     # Item-Codes + Reverse-Items
  └─ excel_columns              # Spalten-Mapping aus 20FLOW7-Export
```

---

## API-Endpunkte  `main.py`

```
GET  /matches/{participant_id}       → Top-N Matches mit Erklärung
GET  /matches/{a_id}/{b_id}          → Score-Detail für ein Paar
POST /matches/run-all                → Alle paarweisen Matches (Analyse)

GET  /participants                   → Liste aller geladenen Personen
GET  /participants/{id}              → Einzelprofil (ohne Roh-Psychometrie)
GET  /stats                          → Datensatz-Übersicht
GET  /risk-overview                  → Ampel-Verteilung (kein PII)

POST /admin/reload-data              → Excel neu einlesen (Hot Reload)
GET  /admin/data-quality             → Qualitätsprüfung pro Skala
GET  /health                         → Liveness
```

---

## Technologie

| Bereich | Technologie |
|---------|------------|
| Sprache | Python 3.12+ |
| Paketmanager | uv |
| Web-Framework | FastAPI |
| Excel-Parsing | pandas + openpyxl |
| Konfiguration | PyYAML (`config.yaml`) |
| Tests | pytest (33 Unit-Tests, offline) |
| Demo-UI | Streamlit (`streamlit_app.py`) |

---

## Datenschutz-Prinzipien (unveränderlich)

1. **Risk Flags werden Match-Partnern niemals angezeigt**
2. **Roh-Psychometriewerte werden nicht an den Endnutzer ausgeliefert**
3. Erklärungen sind neutral formuliert — keine klinische oder stigmatisierende Sprache
4. Jedes Match-Ergebnis trägt den Pflicht-Disclaimer
