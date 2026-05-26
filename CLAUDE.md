# Wohnraum-Partnerschaften — Frontend (Next.js)

## Project Overview

Frontend prototype for the Master's research project at NORDAKADEMIE / 20FLOW7 GmbH.
This is the participant-facing interface for the psychometric roommate-matching system.

**Role of this repo:** Showcase POC for the final presentation.
The goal is a working end-to-end demo: user registers → fills out survey → sees match results.

**Backend:** Separate FastAPI repo (`roommate-matching-nordakademie`) — this frontend calls it via HTTP.
**Auth + Storage:** Self-hosted Appwrite instance (handles registration, sessions, survey data).

This is a **prototype**, not production code. Prefer working features over polish.
Do not over-engineer; every abstraction must earn its place in a 10-week project.

---

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS + shadcn/ui** — rapid component assembly, no custom design system
- **Appwrite Web SDK** — auth (email/password) + database (survey responses)
- **React Hook Form + Zod** — form validation
- **TanStack Query** — data fetching / caching for API calls
- **next-intl** — NOT needed; all UI strings are hardcoded in German

Package manager: `npm` or `pnpm` (prefer `pnpm` for speed).

---

## Architecture

```
Browser
  │
  ├─► Appwrite (self-hosted)        ← Auth + Teilnehmer collection
  │     - Registration / Login
  │     - Store survey responses
  │
  └─► FastAPI (wohnraum-api)        ← Algorithm + matching results
        - GET /matches/{participant_id}
        - GET /participants
        - GET /stats
```

**Data flow:**
1. User registers → Appwrite creates account
2. User fills multi-step survey → responses saved to Appwrite `teilnehmer` collection
3. Results page calls FastAPI `/matches/{id}` → displays ranked matches
4. FastAPI reads from Appwrite (via `AppwriteDataSource`) — participant ID is the link

**Important:** The ClaVis psychometric test (CORE + MOTIVES) is done externally on
the 20FLOW7 platform — the frontend does NOT handle ClaVis. We only collect:
- Our Likert scale items (PSS-10, RS-13, KSA-3, KSDO-3, Aggression, Impulsivität, Neurotizismus, Lifestyle)
- Demographic + constraint fields (Budget, Wohnort, Rauchen, Haustiere, etc.)

---

## Directory Structure

```
wohnraum-frontend/
├── CLAUDE.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── components.json           # shadcn/ui config
├── .env.local.example
└── src/
    ├── app/
    │   ├── layout.tsx            # Root layout — font, global nav
    │   ├── page.tsx              # Landing page (Willkommen)
    │   ├── (auth)/
    │   │   ├── register/
    │   │   │   └── page.tsx      # Registration form
    │   │   └── login/
    │   │       └── page.tsx      # Login form
    │   ├── survey/
    │   │   └── [step]/
    │   │       └── page.tsx      # Multi-step survey (schritt = 1..N)
    │   ├── results/
    │   │   └── page.tsx          # Match results list + score breakdown
    │   └── profile/
    │       └── page.tsx          # View / edit own answers
    ├── components/
    │   ├── ui/                   # shadcn/ui generated components (don't edit)
    │   ├── survey/
    │   │   ├── LikertScale.tsx   # 1–5 Likert scale widget
    │   │   ├── SurveyStep.tsx # Step wrapper (progress bar, nav buttons)
    │   │   └── ConstraintFields.tsx # Budget, Rauchen, Haustiere, etc.
    │   └── matches/
    │       ├── MatchCard.tsx    # Single match card (name, score band, breakdown)
    │       └── ScoreBar.tsx   # Horizontal bar: Persönlichkeit / Lifestyle / Werte …
    ├── lib/
    │   ├── appwrite.ts           # Appwrite client, collection IDs, helpers
    │   ├── api.ts                # FastAPI fetch wrapper (typed, throws on error)
    │   └── surveyScheme.ts      # Zod schema — all survey fields, used for validation
    └── types/
        └── index.ts              # Shared TypeScript types (Teilnehmer, MatchErgebnis…)
```

---

## Appwrite Setup

### Environment variables (`.env.local`)

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-instance.example.com/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<project-id>
NEXT_PUBLIC_APPWRITE_DATABASE_ID=<database-id>
PARTICIPANTS=participants

NEXT_PUBLIC_API_URL=http://localhost:8000   # FastAPI base URL
```

### Appwrite `participants` collection schema

| Attribute          | Type    | Notes                                      |
|--------------------|---------|--------------------------------------------|
| `userId`          | String  | Appwrite Auth UID                          |
| `firstName`          | String  |                                            |
| `lastName`         | String  |                                            |
| `age`            | Integer |                                            |
| `sex`       | String  | "male" / "female" / "diverse" / "prefer not to answer"        |
| `location`          | String  | City name or ZIP                           |
| `budget_min`       | Integer | EUR/month                                  |
| `budget_max`       | Integer |                                            |
| `moveInDate`     | String  | ISO date                                   |
| `smoke`          | String  | "no" / "yes" / "indifferent"                    |
| `pets`        | String  | "no" / "yes" / "indifferrent"                    |
| `onlyFemaleWg`    | Boolean | Only relevant when sex == "female"|
| `pss_1`..`pss_10`  | Integer | PSS-10 items, 1–5                          |
| `rs_1`..`rs_13`    | Integer | RS-13 items, 1–7                           |
| `ksa_1`..`ksa_3`   | Integer | KSA-3 items, 1–5                           |
| `ksdo_1`..`ksdo_3` | Integer | KSDO-3 items, 1–5                          |
| `agg_1`..`agg_N`   | Integer | Aggressions-items, 1–5                     |
| `imp_1`..`imp_N`   | Integer | Impulsivitäts-items, 1–5                   |
| `neu_1`..`neu_N`   | Integer | Neurotizismus-items, 1–5                   |
| `lifestyle_1`..`lifestyle_N` | Integer | Lifestyle items, 1–5              |
| `surveyDone` | Boolean | True once all steps submitted          |

**Column names must match the `excel_columns:` mapping in the FastAPI `config.yaml`.**
If the FastAPI expects `pss_1`, Appwrite must store `pss_1` — keep them in sync.

---

## Survey Structure (Multi-Step)

The survey is split into logical steps. Each step is a separate route `/survey/[step]`.
Progress is saved to Appwrite after each completed step (so users can resume).

| Schritt | Route         | Content                                    |
|---------|---------------|--------------------------------------------|
| 1       | `/survey/1`  | Persönliche Angaben (Vorname, Alter, Geschlecht) |
| 2       | `/survey/2`  | Wohnpräferenzen (Budget, Wohnort, Einzug, Rauchen, Haustiere) |
| 3       | `/survey/3`  | Stress & Belastung (PSS-10)               |
| 4       | `/survey/4`  | Resilienz (RS-13)                          |
| 5       | `/survey/5`  | Werte & Zusammenleben (KSA-3, KSDO-3)    |
| 6       | `/survey/6`  | Persönlichkeit & Verhalten (Aggression, Impulsivität, Neurotizismus) |
| 7       | `/survey/7`  | Lifestyle & Alltagsgewohnheiten           |
| —       | `/results` | Matches (only shown after `surveyDone = true`) |

**Do not collapse all steps into one page.** The multi-step flow is part of the UX demo
that will be shown in the final presentation.

The content could be changed/added

### Likert Widget Conventions

- Scale displayed as 5 buttons (1–5) with German labels:
  `1 = stimme gar nicht zu` … `5 = stimme voll zu`
- RS-13 uses 1–7 — the widget accepts a `max` prop
- No "Skip" buttons on Likert items — all are required within their step
- Show item text verbatim from the 20FLOW7 Fragenkatalog

---

## Results Page (`/results`)

Fetches from FastAPI: `GET /matches/{participant_id}`

### What to display

1. **Match-Liste** — top N matches, sorted by score band:
   - Score band label (very "sehr passend" / "gut passend" / "mäßig passend") — also raw numbers
   - First name only (no surname) + age + city
   - A short one-line compatibility summary in German (generated from score components)

2. **Score-Aufschlüsselung** per match (expandable / accordion):
   - Horizontal bars for each component: Persönlichkeit, Lifestyle, Werte, Komplementarität, Erwartungen
   - Labels in German, proportional fill (0–100%)
   - Do NOT show raw psychometric values or risk flags

3. **Disclaimer** (always visible, below the list):
   > „Dies ist eine Empfehlung, keine Verpflichtung — treffen Sie sich persönlich,
   > bevor Sie eine Entscheidung treffen."

### What to NOT show

- Risk flags (Ampel) of match partners — this is a hard ethical requirement
- Raw scale scores (PSS, RS-13, etc.) of match partners
- The word "Gefährlichkeit" or any risk-related language to users

---

## API Client (`src/lib/api.ts`)

Thin typed wrapper around `fetch`. All calls go to `NEXT_PUBLIC_API_URL`.

```typescript
// Example shape — implement fully
export async function getMatches(participantId: string): Promise<MatchErgebnis[]>
export async function getParticipant(id: string): Promise<Teilnehmer>
export async function getStats(): Promise<DatasetStats>
```

Throw a typed `ApiError` on non-2xx. Do not swallow errors silently.

---

## Appwrite Client (`src/lib/appwrite.ts`)

```typescript
import { Client, Account, Databases } from "appwrite";

export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);
```

Helper functions (save to Appwrite, read own document, mark survey complete) go here.
Keep Appwrite logic out of components and pages.

---

## Authentication Flow

1. `/register` → `account.create()` + `account.createEmailPasswordSession()` → redirect to `/survey/1`
2. `/login` → `account.createEmailPasswordSession()` → redirect to `/results` (if survey done) or `/survey/[next step]`
3. Protected routes check session via `account.get()` in a layout or middleware
4. Logout: `account.deleteSession('current')`

No OAuth, magic links, or phone auth — email/password only for the POC.

---

## Coding Conventions

- **TypeScript strict mode** — no `any`, no non-null assertions without a comment explaining why
- **All user-facing strings in German** — no i18n library, hardcode in the component
- **Code and comments in English**
- **shadcn/ui components** for all standard UI (Button, Card, Input, Select, Progress, Accordion)
- **React Hook Form** for all forms — no uncontrolled inputs
- **Zod schemas** in `surveyScheme.ts` — define once, use in form validation AND TypeScript types
- **No Redux / Zustand** — React state + TanStack Query is sufficient for this POC
- **Server Components** where possible (data fetching); Client Components only when interactivity needed

### File naming
- Pages: `page.tsx` (Next.js convention)
- Components: PascalCase, english domain names (`MatchCard.tsx`, `LikertScale.tsx`)
- Lib files: camelCase (`appwrite.ts`, `api.ts`)

---

## Development

```bash
pnpm install
cp .env.local.example .env.local  # fill in Appwrite + API URL
pnpm dev
```

FastAPI must be running locally on port 8000 (see `roommate-matching-nordakademie` repo).
Appwrite must be reachable at the configured endpoint.

---

## Current State

### What to build (POC scope)
- [ ] Project scaffolding (Next.js 15, Tailwind, shadcn/ui, Appwrite SDK)
- [ ] Appwrite collection + attributes created
- [ ] Registration + login pages
- [ ] Multi-step survey (all 7 steps)
- [ ] Auto-save survey progress to Appwrite
- [ ] Results page (match list + score breakdown)
- [ ] Route protection (redirect unauthenticated users)

### Out of scope for POC
- Profile edit after submission
- Admin dashboard
- Real-time match updates
- Email verification
- Password reset flow
- Mobile-optimized layout (desktop first for the presentation)
- ClaVis integration (handled externally by 20FLOW7)

---

## Ethical / Legal Requirements (Same as Backend)

These are non-negotiable and must be respected in every UI decision:

1. **Risk flags of match partners are NEVER shown to users** — not even partially
2. Raw psychometric scores of other participants are never exposed
3. Match results use score bands in neutral German — no alarming labels
4. Disclaimer must be visible on the results page at all times
