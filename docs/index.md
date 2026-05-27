---
title: Übersicht
nav_order: 1
---

# Systemarchitektur — Wohnraum-Partnerschaften

Sprint Review · 27. Mai 2026

---

## 1. Highlevel System-Übersicht

```mermaid
graph TB
    subgraph EXT [" "]
        CLAVIS["20FLOW7 ClaVis-Plattform\n  (CORE + MOTIVES Test)"]
        EXCEL["Excel-Export (.xlsx)\n  ClaVis-Werte + eigene Items"]
    end

    subgraph BE ["Backend-Dienste"]
        APPWRITE[("Appwrite\n eigener Server\n Authentifizierung · Teilnehmer-DB")]
        FASTAPI["FastAPI\n Matching-Algorithmus"]
    end

    subgraph FE ["Frontend"]
        NEXTJS["Next.js 15\n roommate-matching-nextjs"]
    end

    TEILNEHMER["👤 Teilnehmer"]

    CLAVIS -->|"Export .xlsx"| EXCEL
    EXCEL -->|"Seed-Skript\n (manuell, aktuell)"| APPWRITE
    APPWRITE -->|"Teilnehmer lesen"| FASTAPI
    EXCEL -.->|"Direktzugriff\n (Fallback)"| FASTAPI
    FASTAPI -->|"GET /matches/{teilnehmer_id}"| NEXTJS
    NEXTJS <-->|"Anmeldung + Umfrage-Speicherung"| APPWRITE
    TEILNEHMER -->|"nutzt Browser"| NEXTJS
```


---

## 2. Aktueller Datenfluss

Wie die Daten heute fließen, bevor die Appwrite-Anbindung im Algorithmus abgeschlossen ist.

```mermaid
flowchart LR
    subgraph STEP1 ["① Datenerhebung"]
        C["ClaVis-Plattform"]
        XL["teilnehmer.xlsx\n 50 Teilnehmer\n ClaVis Spalten A–AO\n Eigene Spalten AP+"]
        C -->|"Export"| XL
    end

    subgraph STEP2 ["② Manuelle Migration (Entwickler)"]
        SEED["seed_participants.py\n setup-appwrite.mjs"]
        AW[("Appwrite\n Teilnehmer-Collection\n 50 Dokumente\n surveyDone = true")]
        XL -->|"Zeilen einlesen"| SEED
        SEED -->|"Nutzerkonten +\n Dokumente anlegen"| AW
    end

    subgraph STEP3 ["③ Algorithmus"]
        API["FastAPI\n /matches/{id}"]
        XL -->|"Direktzugriff\n (Appwrite-Anbindung ausstehend)"| API
    end

    subgraph STEP4 ["④ Frontend"]
        NJ["Next.js\n /results"]
        AW -->|"Sitzungsauthentifizierung"| NJ
        API -->|"gereifte Matches"| NJ
    end
```
---

## 4. User Experience — Ablauf im Frontend

```mermaid
flowchart TD
    START(["Nutzer öffnet App"])

    START --> CHECK{"Sitzung\n vorhanden?"}
    CHECK -->|"nein"| AUTH["/ Startseite"]
    CHECK -->|"ja"| SDONE{"Umfrage\n abgeschlossen?"}

    AUTH --> REG["/register\n Konto anlegen"]
    AUTH --> LOGIN["/login\n Anmelden"]

    REG --> S1
    LOGIN --> SDONE

    SDONE -->|"nein"| S1["/survey/1\n Persönliche Angaben"]
    SDONE -->|"ja"| RES

    S1 --> S2["/survey/2\n Bedürfnisse/Wohnpräferenzen"]
    S2 --> S3["/survey/3\n Stress · PSS-5"]
    S3 --> S4["/survey/4\n Resilienz · RS-5"]
    S4 --> S5["/survey/5\n Werte · KSA / KSDO"]
    S5 --> S6["/survey/6\n etc"]
    S6 --> S7["/survey/7\n Lifestyle & Alltag"]

    S7 -->|"Umfrage abgeschlossen\n in Appwrite gespeichert"| RES

    RES["/results\n GET /matches/{teilnehmerId}\n über FastAPI"]

    style RES fill:#f0fdf4,stroke:#22c55e,stroke-width:2px
```
---

## Aktueller Projektstatus

| Komponente | Status |
|------------|--------|
| Next.js Frontend (Anmeldung + Umfrage + Ergebnisse) | ✅ Fertig |
| Appwrite — Authentifizierung & Teilnehmer-Collection | ✅ Läuft (eigener Server) |
| FastAPI-Algorithmus (Excel-Datenquelle) | ✅ Funktionsfähig |
| Ergebnis-Ansicht mit Score-Aufschlüsselung | ✅ Fertig |
| FastAPI — Appwrite-Datenquelle | 🔄 In Arbeit |
| Manuelle Datenmigration Excel → Appwrite | 🔄 Aktueller Workaround |
| ClaVis Live-Integration | ⏳ Außerhalb POC-Umfang |
