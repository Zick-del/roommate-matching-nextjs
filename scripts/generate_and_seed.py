#!/usr/bin/env python3
"""
generate_and_seed.py — Generates 50 synthetic participants, writes Excel, seeds Appwrite.

Steps:
  1. Generate 50 participants with all new field names (new survey structure)
  2. Write to ../../roommate-matching-nordakademie/data/teilnehmer.xlsx
     (direct columns, no triplet format — for FastAPI Excel mode)
  3. Delete existing demo documents and users from Appwrite
  4. Seed new Auth users + participant documents (for FastAPI Appwrite mode + login)

The document $id and Excel ID column are identical, so FastAPI returns the same
participant_id regardless of which data source it uses.

Usage:
    python3 scripts/generate_and_seed.py

Prerequisites:
    pip install openpyxl
"""

import json
import random
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("❌  openpyxl not found.  Run: pip install openpyxl")
    sys.exit(1)

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
ENV_FILE = ROOT / ".env.local"
NORDAKADEMIE = ROOT.parent / "roommate-matching-nordakademie"
EXCEL_PATH = NORDAKADEMIE / "data" / "teilnehmer.xlsx"

# ── Config ────────────────────────────────────────────────────────────────────

def _load_env(path: Path) -> dict:
    env = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


_env = _load_env(ENV_FILE)
ENDPOINT      = _env.get("NEXT_PUBLIC_APPWRITE_ENDPOINT", "http://localhost/v1").rstrip("/")
PROJECT_ID    = _env.get("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "")
DATABASE_ID   = _env.get("NEXT_PUBLIC_APPWRITE_DATABASE_ID", "")
COLLECTION_ID = _env.get("NEXT_PUBLIC_PARTICIPANTS_COLLECTION_ID", "participants")
API_KEY       = _env.get("APPWRITE_API_KEY", "")
DEMO_PASSWORD = "Demo1234!"
EMAIL_DOMAIN  = "nak-demo.de"

HEADERS = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT_ID,
    "X-Appwrite-Key": API_KEY,
}

# ── Appwrite REST ─────────────────────────────────────────────────────────────

def aw(method: str, path: str, body: dict | None = None) -> tuple[dict, int]:
    url = f"{ENDPOINT}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
            return (json.loads(raw) if raw else {}), resp.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return json.loads(raw), e.code
        except json.JSONDecodeError:
            return {"message": raw}, e.code

# ── Data generation ────────────────────────────────────────────────────────────

_FIRST_NAMES = [
    "Anna", "Tobias", "Sarah", "Lars", "Marie", "Tim", "Lisa", "Jonas",
    "Emma", "David", "Lena", "Max", "Julia", "Felix", "Hanna", "Moritz",
    "Clara", "Lukas", "Sophie", "Niklas", "Laura", "Jan", "Mia", "Paul",
    "Lea", "Tom", "Katharina", "Simon", "Franziska", "Erik", "Nadine",
    "Florian", "Vera", "Patrick", "Johanna", "Sebastian", "Alina",
    "Christian", "Theresa", "Daniel", "Melanie", "Marco", "Isabel",
    "Stefan", "Vanessa", "Markus", "Tanja", "Oliver", "Sabrina", "Kevin",
]

# Cluster in Hamburg metro area (max 30km from center) for better match coverage
# (name, base_lat, base_lon, city_label)
_LOCATIONS = [
    ("Hamburg-Altona",      53.5502, 9.9353,  "Hamburg"),
    ("Hamburg-Eimsbüttel",  53.5741, 9.9631,  "Hamburg"),
    ("Hamburg-Wandsbek",    53.5751, 10.0687, "Hamburg"),
    ("Hamburg-Harburg",     53.4610, 10.0006, "Hamburg"),
    ("Hamburg-Bergedorf",   53.4876, 10.2176, "Hamburg"),
    ("Hamburg-Mitte",       53.5500, 10.0000, "Hamburg"),
    ("Hamburg-Nord",        53.5967, 10.0069, "Hamburg"),
    ("Norderstedt",         53.7000, 9.9978,  "Norderstedt"),
    ("Pinneberg",           53.6617, 9.7960,  "Pinneberg"),
]

_NOISE_SELF   = ["ruhig", "manchmal", "gelegentlich", "haeufig", "unterschiedlich"]
_GUESTS_SELF  = ["selten", "gelegentlich", "mehrmals_woche", "haeufig_spontan", "unterschiedlich"]
_NOISE_TOL    = ["selten", "gelegentlich", "wochenende", "haeufig", "sehr_haeufig"]
_GUESTS_TOL   = ["selten", "gelegentlich", "mehrmals_woche", "haeufig_spontan", "egal"]
_COMMUNITY    = ["nie", "monatlich", "woechentlich", "mehrmals", "flexibel"]
_SHARING      = ["nicht_gerne", "nicht_ok", "kleinigkeiten_ok", "alles_teilen", "egal"]
_SMOKING      = ["nein", "nein", "nein", "nein", "nur_draussen", "zimmer"]
_SMOKING_TOL  = ["nein", "nein", "nur_draussen", "balkon", "zimmer"]
_TAGESRHYTHM  = ["schicht", "buero", "buero", "homeoffice"]
_HAUSTIERE_TOL = ["ja", "nein", "nein", "mit_ausnahme"]
_BILDUNGSSTAND = ["realschule", "abitur", "abitur", "bachelor", "master"]
_GESCHIRR     = ["sofort", "nach_dem_essen", "taeglich", "wenn_zeit"]
_ROLLEN       = ["suchend", "suchend", "suchend", "anbietend", "anbietend"]


def _r(mn: int, mx: int) -> int:
    return random.randint(mn, mx)


def _generate_participants(n: int = 50, seed: int = 42) -> list[dict]:
    random.seed(seed)
    participants = []

    for i in range(n):
        pid    = f"nak-{i + 1:03d}"
        name   = f"{_FIRST_NAMES[i % len(_FIRST_NAMES)]} {chr(65 + (i % 17))}."
        gender = random.choice(["m", "m", "w", "w", "d"])
        age    = _r(19, 65)
        rolle  = random.choice(_ROLLEN)

        _, base_lat, base_lon, city = random.choice(_LOCATIONS)
        lat    = round(base_lat + random.uniform(-0.04, 0.04), 6)
        lon    = round(base_lon + random.uniform(-0.06, 0.06), 6)
        radius = random.choice([20, 25, 30, 35, 40])

        budget_min = (_r(6, 10) * 50)           # 300–500
        budget_max = budget_min + random.choice([100, 150, 200, 250, 300])
        einzug     = (date.today() + timedelta(days=_r(14, 120))).isoformat()

        kinder           = random.random() < 0.10
        ausschluss_kinder = (not kinder) and random.random() < 0.15

        haustiere_bool = random.random() < 0.15
        haustiere_art  = ""
        if haustiere_bool:
            haustiere_art = random.choice(["Katze", "Hund", "Hund, Katze", "Hamster"])

        # Lifestyle enums
        rauchen            = random.choice(_SMOKING)
        rauchen_tol        = random.choice(_SMOKING_TOL)
        eigene_lautstaerke = random.choice(_NOISE_SELF)
        eigener_besuch     = random.choice(_GUESTS_SELF)
        tagesrhythmus      = random.choice(_TAGESRHYTHM)
        haustiere_tol      = random.choice(_HAUSTIERE_TOL)

        # Lifestyle ints
        ich_ordentlich    = _r(2, 5)
        sauberkeit_wichtig = _r(2, 5)
        wg_unterstuetzung = _r(1, 5)

        # Expectation enums
        gem_haeufigkeit    = random.choice(_COMMUNITY)
        fremde_lautstaerke = random.choice(_NOISE_TOL)
        fremder_besuch     = random.choice(_GUESTS_TOL)
        teilen_haltung     = random.choice(_SHARING)
        geschirr_wann      = random.choice(_GESCHIRR)
        laerm_empfindlichkeit = _r(1, 5)

        # Constraints
        ausschluss_geschlecht = ""
        if gender == "w" and random.random() < 0.20:
            ausschluss_geschlecht = "m"
        bildungsstand = random.choice(_BILDUNGSSTAND)

        # ClaVis (0–100)
        clavis_s           = _r(20, 90)
        clavis_a           = _r(20, 90)
        clavis_o           = _r(20, 90)
        clavis_p           = _r(20, 90)
        clavis_sicherheit  = _r(15, 90)
        clavis_stimulation = _r(15, 90)

        # Psychometrie items (1–5)
        e  = [_r(1, 5) for _ in range(6)]
        ze1 = random.choice(["ja", "nein"])
        ze2 = random.choice(["ja", "nein"])
        s  = [_r(1, 5) for _ in range(5)]
        r  = [_r(2, 5) for _ in range(5)]
        pa = [_r(1, 5) for _ in range(4)]
        pd = [_r(1, 5) for _ in range(3)]
        ga = [_r(1, 4) for _ in range(3)]
        gn = [_r(1, 5) for _ in range(3)]
        cm = [_r(1, 5) for _ in range(3)]

        participants.append({
            "id": pid, "name": name, "gender": gender, "age": age, "rolle": rolle,
            "city": city, "wohnort_lat": lat, "wohnort_lon": lon, "wohnort_radius": radius,
            "budget_min": budget_min, "budget_max": budget_max, "einzug_datum": einzug,
            "kinder": kinder, "ausschluss_kinder": ausschluss_kinder,
            "bildungsstand": bildungsstand,
            "haustiere": "ja" if haustiere_bool else "nein",
            "haustiere_art": haustiere_art,
            "haustiere_toleranz": haustiere_tol,
            "rauchen": rauchen, "rauchen_toleranz": rauchen_tol,
            "eigene_lautstaerke": eigene_lautstaerke,
            "eigener_besuch": eigener_besuch,
            "tagesrhythmus": tagesrhythmus,
            "ich_ordentlich": ich_ordentlich,
            "sauberkeit_wichtig": sauberkeit_wichtig,
            "wg_unterstuetzung": wg_unterstuetzung,
            "gem_haeufigkeit": gem_haeufigkeit,
            "fremde_lautstaerke": fremde_lautstaerke,
            "fremder_besuch": fremder_besuch,
            "teilen_haltung": teilen_haltung,
            "geschirr_wann": geschirr_wann,
            "laerm_empfindlichkeit": laerm_empfindlichkeit,
            "ausschluss_geschlecht": ausschluss_geschlecht,
            "ausschluss_alter": "",
            "mindest_bildung": "",
            "clavis_s": clavis_s, "clavis_a": clavis_a,
            "clavis_o": clavis_o, "clavis_p": clavis_p,
            "clavis_sicherheit": clavis_sicherheit,
            "clavis_stimulation": clavis_stimulation,
            "e1": e[0], "e2": e[1], "e3": e[2], "e4": e[3], "e5": e[4], "e6": e[5],
            "ze1": ze1, "ze2": ze2,
            "s1": s[0], "s2": s[1], "s3": s[2], "s4": s[3], "s5": s[4],
            "r1": r[0], "r2": r[1], "r3": r[2], "r4": r[3], "r5": r[4],
            "pa1": pa[0], "pa2": pa[1], "pa3": pa[2], "pa4": pa[3],
            "pd1": pd[0], "pd2": pd[1], "pd3": pd[2],
            "ga1": ga[0], "ga2": ga[1], "ga3": ga[2],
            "gn1": gn[0], "gn2": gn[1], "gn3": gn[2],
            "cm1": cm[0], "cm2": cm[1], "cm3": cm[2],
        })

    return participants

# ── Excel writer ───────────────────────────────────────────────────────────────

_EXCEL_COLUMNS = [
    "ID", "Alter", "Geschlecht",
    "S", "A", "O", "P", "Sicherheit", "Stimulation",
    "anzeigename", "rolle",
    "budget_min", "budget_max",
    "wohnort_stadt", "wohnort_lat", "wohnort_lon", "wohnort_radius",
    "einzug_datum",
    "kinder", "bildungsstand", "sprache_deutsch",
    "haustiere", "haustiere_art",
    "ich_ordentlich", "eigene_lautstaerke", "eigener_besuch",
    "rauchen", "tagesrhythmus",
    "sauberkeit_wichtig", "gem_haeufigkeit", "wg_unterstuetzung",
    "fremde_lautstaerke", "fremder_besuch", "laerm_empfindlichkeit",
    "rauchen_toleranz", "haustiere_toleranz",
    "teilen_haltung", "geschirr_wann",
    "ausschluss_geschlecht", "ausschluss_alter", "ausschluss_kinder",
    "mindest_bildung",
    "e1","e2","e3","e4","e5","e6",
    "ze1","ze2",
    "s1","s2","s3","s4","s5",
    "r1","r2","r3","r4","r5",
    "pa1","pa2","pa3","pa4",
    "pd1","pd2","pd3",
    "ga1","ga2","ga3",
    "gn1","gn2","gn3",
    "cm1","cm2","cm3",
]


def _write_excel(participants: list[dict], path: Path) -> None:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Teilnehmer"
    ws.append(_EXCEL_COLUMNS)

    for p in participants:
        row = [
            p["id"], p["age"], p["gender"],
            p["clavis_s"], p["clavis_a"], p["clavis_o"], p["clavis_p"],
            p["clavis_sicherheit"], p["clavis_stimulation"],
            p["name"], p["rolle"],
            p["budget_min"], p["budget_max"],
            p["city"], p["wohnort_lat"], p["wohnort_lon"], p["wohnort_radius"],
            p["einzug_datum"],
            "ja" if p["kinder"] else "nein",
            p["bildungsstand"], "ja",
            p["haustiere"], p["haustiere_art"],
            p["ich_ordentlich"], p["eigene_lautstaerke"], p["eigener_besuch"],
            p["rauchen"], p["tagesrhythmus"],
            p["sauberkeit_wichtig"], p["gem_haeufigkeit"], p["wg_unterstuetzung"],
            p["fremde_lautstaerke"], p["fremder_besuch"], p["laerm_empfindlichkeit"],
            p["rauchen_toleranz"], p["haustiere_toleranz"],
            p["teilen_haltung"], p["geschirr_wann"],
            p["ausschluss_geschlecht"], p["ausschluss_alter"],
            "ja" if p["ausschluss_kinder"] else "nein",
            p["mindest_bildung"],
            p["e1"],p["e2"],p["e3"],p["e4"],p["e5"],p["e6"],
            p["ze1"],p["ze2"],
            p["s1"],p["s2"],p["s3"],p["s4"],p["s5"],
            p["r1"],p["r2"],p["r3"],p["r4"],p["r5"],
            p["pa1"],p["pa2"],p["pa3"],p["pa4"],
            p["pd1"],p["pd2"],p["pd3"],
            p["ga1"],p["ga2"],p["ga3"],
            p["gn1"],p["gn2"],p["gn3"],
            p["cm1"],p["cm2"],p["cm3"],
        ]
        ws.append(row)

    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
    print(f"  ✓ {path} ({len(participants)} rows, {len(_EXCEL_COLUMNS)} columns)")

# ── Appwrite cleanup ──────────────────────────────────────────────────────────

def _aw_list_query(queries: list[dict]) -> str:
    """Build query string for Appwrite 1.9.0 JSON query format."""
    return "&".join(f"queries[]={urllib.parse.quote(json.dumps(q))}" for q in queries)


def _delete_all_documents() -> int:
    base = f"/databases/{DATABASE_ID}/collections/{COLLECTION_ID}/documents"
    deleted = 0
    cursor = None

    while True:
        qs: list[dict] = [{"method": "limit", "values": [100]}]
        if cursor:
            qs.append({"method": "cursorAfter", "values": [cursor]})
        result, _ = aw("GET", f"{base}?{_aw_list_query(qs)}")
        docs = result.get("documents", [])
        if not docs:
            break
        for doc in docs:
            _, code = aw("DELETE", f"{base}/{doc['$id']}")
            if code in (200, 204):
                deleted += 1
        if len(docs) < 100:
            break
        cursor = docs[-1]["$id"]

    return deleted


def _delete_demo_users() -> int:
    deleted = 0
    cursor = None

    while True:
        qs: list[dict] = [{"method": "limit", "values": [100]}]
        if cursor:
            qs.append({"method": "cursorAfter", "values": [cursor]})
        result, _ = aw("GET", f"/users?{_aw_list_query(qs)}")
        users = result.get("users", [])
        if not users:
            break
        for user in users:
            if str(user.get("email", "")).endswith(f"@{EMAIL_DOMAIN}"):
                _, code = aw("DELETE", f"/users/{user['$id']}")
                if code in (200, 204):
                    deleted += 1
        if len(users) < 100:
            break
        cursor = users[-1]["$id"]

    return deleted

# ── Appwrite seeding ──────────────────────────────────────────────────────────

def _seed_one(p: dict) -> tuple[str, bool]:
    """Create auth user + document. Returns (email, success)."""
    idx   = p["id"].replace("nak-", "")
    email = f"teilnehmer{idx}@{EMAIL_DOMAIN}"

    # Create Auth user with same ID as document
    user_body = {
        "userId": p["id"],
        "email": email,
        "password": DEMO_PASSWORD,
        "name": p["name"],
    }
    user_resp, user_code = aw("POST", "/users", user_body)
    if user_code in (200, 201):
        real_uid = user_resp.get("$id", p["id"])
    elif user_code == 409:
        real_uid = p["id"]  # already exists, reuse same ID
    else:
        print(f"    ⚠ user {email}: {user_resp.get('message', user_code)}")
        real_uid = p["id"]

    # Build document payload — filter empty strings and None
    doc: dict = {
        "userId": real_uid,
        "anzeigename": p["name"],
        "gender": p["gender"],
        "age": p["age"],
        "rolle": p["rolle"],
        "surveyDone": True,
        "completedStep": 7,  # Appwrite attr max is 7; surveyDone drives routing
        # Housing
        "budget_min": p["budget_min"],
        "budget_max": p["budget_max"],
        "wohnort_stadt": p["city"],
        "wohnort_lat": p["wohnort_lat"],
        "wohnort_lon": p["wohnort_lon"],
        "radius_km": p["wohnort_radius"],       # Appwrite attribute name is radius_km
        "wohnort_radius": p["wohnort_radius"],  # new attribute (after setup-appwrite.mjs)
        "einzug_datum": p["einzug_datum"],
        # Demographics
        "kinder": p["kinder"],
        "bildungsstand": p["bildungsstand"],
        "sprache_deutsch": True,
        "haustiere": p["haustiere"],
        "haustiere_art": p["haustiere_art"],
        # Lifestyle
        "ich_ordentlich": p["ich_ordentlich"],
        "eigene_lautstaerke": p["eigene_lautstaerke"],
        "eigener_besuch": p["eigener_besuch"],
        "rauchen": p["rauchen"],
        "tagesrhythmus": p["tagesrhythmus"],
        "sauberkeit_wichtig": p["sauberkeit_wichtig"],
        "gem_haeufigkeit": p["gem_haeufigkeit"],
        "wg_unterstuetzung": p["wg_unterstuetzung"],
        # Expectations
        "fremde_lautstaerke": p["fremde_lautstaerke"],
        "fremder_besuch": p["fremder_besuch"],
        "teilen_haltung": p["teilen_haltung"],
        "geschirr_wann": p["geschirr_wann"],
        "rauchen_toleranz": p["rauchen_toleranz"],
        "haustiere_toleranz": p["haustiere_toleranz"],
        # Constraints
        "ausschluss_kinder": p["ausschluss_kinder"],
        # ClaVis
        "clavis_s": p["clavis_s"],
        "clavis_a": p["clavis_a"],
        "clavis_o": p["clavis_o"],
        "clavis_p": p["clavis_p"],
        "clavis_sicherheit": p["clavis_sicherheit"],
        "clavis_stimulation": p["clavis_stimulation"],
        # Psychometrie
        **{f"e{i}": p[f"e{i}"] for i in range(1, 7)},
        "ze1": p["ze1"], "ze2": p["ze2"],
        **{f"s{i}": p[f"s{i}"] for i in range(1, 6)},
        **{f"r{i}": p[f"r{i}"] for i in range(1, 6)},
        **{f"pa{i}": p[f"pa{i}"] for i in range(1, 5)},
        **{f"pd{i}": p[f"pd{i}"] for i in range(1, 4)},
        **{f"ga{i}": p[f"ga{i}"] for i in range(1, 4)},
        **{f"gn{i}": p[f"gn{i}"] for i in range(1, 4)},
        **{f"cm{i}": p[f"cm{i}"] for i in range(1, 4)},
    }
    # Include optional string fields only if non-empty
    if p.get("ausschluss_geschlecht"):
        doc["ausschluss_geschlecht"] = p["ausschluss_geschlecht"]
    if p.get("haustiere_art"):
        doc["haustiere_art"] = p["haustiere_art"]

    # Remove None values — Appwrite rejects null for non-nullable attributes
    doc = {k: v for k, v in doc.items() if v is not None}

    doc_base = f"/databases/{DATABASE_ID}/collections/{COLLECTION_ID}/documents"
    doc_resp, doc_code = aw("POST", doc_base, {
        "documentId": p["id"],
        "data": doc,
        "permissions": ['read("users")', 'update("users")'],
    })

    if doc_code == 409:
        _, upd_code = aw("PATCH", f"{doc_base}/{p['id']}", {"data": doc})
        return email, upd_code in (200, 201)
    if doc_code in (200, 201):
        return email, True

    print(f"    ⚠ doc {p['id']}: {doc_resp.get('message', doc_code)}")
    return email, False

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    if not API_KEY:
        print("❌  APPWRITE_API_KEY missing from .env.local")
        sys.exit(1)

    print("\n🔧  Generate & Seed — 50 synthetic participants")
    print(f"   Appwrite:  {ENDPOINT}")
    print(f"   Database:  {DATABASE_ID}")
    print(f"   Excel:     {EXCEL_PATH}\n")

    # 1. Generate
    print("📊  Generating participants…")
    participants = _generate_participants(50)
    print(f"    ✓ {len(participants)} participants generated\n")

    # 2. Write Excel
    print(f"📝  Writing Excel…")
    _write_excel(participants, EXCEL_PATH)
    print()

    # 3. Clean Appwrite
    print("🗑   Deleting existing Appwrite data…")
    n_docs  = _delete_all_documents()
    n_users = _delete_demo_users()
    print(f"    ✓ {n_docs} documents, {n_users} users deleted\n")

    # 4. Seed
    print("🌱  Seeding Appwrite…")
    credentials: list[tuple[str, str]] = []
    ok = fail = 0

    for p in participants:
        email, success = _seed_one(p)
        if success:
            ok += 1
            credentials.append((p["name"], email))
        else:
            fail += 1
            print(f"    ✗ {p['id']} failed")

    print(f"\n✅  {ok}/{len(participants)} seeded ({fail} failed)\n")

    # Credentials table
    width = 68
    print("=" * width)
    print(f"  {'Name':<22}  {'Email':<38}  Password")
    print("-" * width)
    for name, email in credentials[:15]:
        print(f"  {name:<22}  {email:<38}  {DEMO_PASSWORD}")
    if len(credentials) > 15:
        print(f"  … and {len(credentials) - 15} more (all use same password)")
    print("=" * width)
    print(f"\n  All passwords:  {DEMO_PASSWORD}")
    print(f"  Login URL:      http://localhost:3000/login\n")


if __name__ == "__main__":
    main()
