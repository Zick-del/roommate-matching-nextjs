/**
 * One-shot Appwrite collection setup script.
 *
 * Usage:
 *   1. Create an API key in Appwrite Console → Project → API Keys
 *      (grant: databases.read, databases.write, collections.read, collections.write, attributes.read, attributes.write)
 *   2. Run:  APPWRITE_API_KEY=<key> node scripts/setup-appwrite.mjs
 *
 * The script reads NEXT_PUBLIC_* from .env.local automatically.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local ──────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env.local");
let envContent = "";
try {
  envContent = readFileSync(envPath, "utf-8");
} catch {
  console.error("❌  .env.local not found. Copy .env.local.example and fill it in first.");
  process.exit(1);
}

function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : process.env[key];
}

const ENDPOINT = getEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const PROJECT_ID = getEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const DATABASE_ID = getEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID");
const COLLECTION_ID = getEnv("NEXT_PUBLIC_PARTICIPANTS_COLLECTION_ID") ?? "participants";
const API_KEY = getEnv("APPWRITE_API_KEY");

if (!ENDPOINT || !PROJECT_ID || !DATABASE_ID) {
  console.error("❌  Missing NEXT_PUBLIC_APPWRITE_ENDPOINT / PROJECT_ID / DATABASE_ID in .env.local");
  process.exit(1);
}
if (!API_KEY) {
  console.error("❌  APPWRITE_API_KEY env var not set.\n   Run: APPWRITE_API_KEY=<key> node scripts/setup-appwrite.mjs");
  process.exit(1);
}

// ── Appwrite REST helpers ────────────────────────────────────────────────────
const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": PROJECT_ID,
  "X-Appwrite-Key": API_KEY,
};

async function request(method, path, body) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${path}: ${json.message ?? JSON.stringify(json)}`);
  return json;
}

async function createStringAttr(collId, key, size = 255, required = false, defaultVal = null) {
  try {
    await request("POST", `/databases/${DATABASE_ID}/collections/${collId}/attributes/string`, {
      key,
      size,
      required,
      ...(defaultVal !== null ? { default: defaultVal } : {}),
    });
    console.log(`  ✓ string  ${key}`);
  } catch (e) {
    if (e.message.includes("409") || e.message.toLowerCase().includes("already exist")) {
      console.log(`  · skip   ${key} (exists)`);
    } else {
      console.warn(`  ⚠ ${key}: ${e.message}`);
    }
  }
}

async function createIntAttr(collId, key, required = false, min = null, max = null, defaultVal = null) {
  try {
    await request("POST", `/databases/${DATABASE_ID}/collections/${collId}/attributes/integer`, {
      key,
      required,
      ...(min !== null ? { min } : {}),
      ...(max !== null ? { max } : {}),
      ...(defaultVal !== null ? { default: defaultVal } : {}),
    });
    console.log(`  ✓ integer ${key}`);
  } catch (e) {
    if (e.message.includes("409") || e.message.toLowerCase().includes("already exist")) {
      console.log(`  · skip   ${key} (exists)`);
    } else {
      console.warn(`  ⚠ ${key}: ${e.message}`);
    }
  }
}

async function createBoolAttr(collId, key, required = false, defaultVal = null) {
  try {
    await request("POST", `/databases/${DATABASE_ID}/collections/${collId}/attributes/boolean`, {
      key,
      required,
      ...(defaultVal !== null ? { default: defaultVal } : {}),
    });
    console.log(`  ✓ boolean ${key}`);
  } catch (e) {
    if (e.message.includes("409") || e.message.toLowerCase().includes("already exist")) {
      console.log(`  · skip   ${key} (exists)`);
    } else {
      console.warn(`  ⚠ ${key}: ${e.message}`);
    }
  }
}

async function createFloatAttr(collId, key, required = false, min = null, max = null) {
  try {
    await request("POST", `/databases/${DATABASE_ID}/collections/${collId}/attributes/float`, {
      key,
      required,
      ...(min !== null ? { min } : {}),
      ...(max !== null ? { max } : {}),
    });
    console.log(`  ✓ float   ${key}`);
  } catch (e) {
    if (e.message.includes("409") || e.message.toLowerCase().includes("already exist")) {
      console.log(`  · skip   ${key} (exists)`);
    } else {
      console.warn(`  ⚠ ${key}: ${e.message}`);
    }
  }
}

async function createIndex(collId, key, attributes) {
  try {
    await request("POST", `/databases/${DATABASE_ID}/collections/${collId}/indexes`, {
      key,
      type: "key",
      attributes,
    });
    console.log(`  ✓ index   ${key}`);
  } catch (e) {
    if (e.message.includes("409") || e.message.toLowerCase().includes("already exist")) {
      console.log(`  · skip   index ${key} (exists)`);
    } else {
      console.warn(`  ⚠ index ${key}: ${e.message}`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔧  Appwrite setup`);
  console.log(`   Endpoint:   ${ENDPOINT}`);
  console.log(`   Project:    ${PROJECT_ID}`);
  console.log(`   Database:   ${DATABASE_ID}`);
  console.log(`   Collection: ${COLLECTION_ID}\n`);

  // 1. Ensure collection exists
  let collectionExists = false;
  try {
    await request("GET", `/databases/${DATABASE_ID}/collections/${COLLECTION_ID}`);
    collectionExists = true;
    console.log(`✓ Collection "${COLLECTION_ID}" already exists.\n`);
  } catch {
    console.log(`Creating collection "${COLLECTION_ID}"…`);
    await request("POST", `/databases/${DATABASE_ID}/collections`, {
      collectionId: COLLECTION_ID,
      name: "participants",
      permissions: [],
      documentSecurity: true,
    });
    console.log(`✓ Collection created.\n`);
  }
  void collectionExists;

  console.log("Adding attributes…");

  // 2. Identity / meta
  await createStringAttr(COLLECTION_ID, "userId", 36, true);
  await createStringAttr(COLLECTION_ID, "anzeigename", 100);
  await createStringAttr(COLLECTION_ID, "gender", 10);       // "m" | "f" | "d"
  await createIntAttr(COLLECTION_ID, "age", false, 18, 99);
  await createStringAttr(COLLECTION_ID, "rolle", 20);        // "suchend" | "anbietend"

  // 3. Survey progress
  await createBoolAttr(COLLECTION_ID, "surveyDone", false, false);
  await createIntAttr(COLLECTION_ID, "completedStep", false, 0, 8, 0);

  // 4. Housing prefs
  await createIntAttr(COLLECTION_ID, "budget_min", false, 0, 10000);
  await createIntAttr(COLLECTION_ID, "budget_max", false, 0, 10000);
  await createStringAttr(COLLECTION_ID, "location", 100);
  await createStringAttr(COLLECTION_ID, "einzug_fruehestens", 20);
  await createStringAttr(COLLECTION_ID, "einzug_spaetestens", 20);
  await createStringAttr(COLLECTION_ID, "raucher", 10);
  await createStringAttr(COLLECTION_ID, "raucher_toleranz", 10);
  await createStringAttr(COLLECTION_ID, "haustiere", 50);
  await createStringAttr(COLLECTION_ID, "haustiere_toleranz", 50);
  await createBoolAttr(COLLECTION_ID, "nur_frauen_wg", false, false);

  // 5. PSS-5
  for (let i = 1; i <= 5; i++) await createIntAttr(COLLECTION_ID, `pss_${i}`, false, 1, 5);

  // 6. RS-5
  for (let i = 1; i <= 5; i++) await createIntAttr(COLLECTION_ID, `rs_${i}`, false, 1, 5);

  // 7. KSA-5
  for (let i = 1; i <= 5; i++) await createIntAttr(COLLECTION_ID, `ksa_${i}`, false, 1, 5);

  // 8. KSDO-3
  for (let i = 1; i <= 3; i++) await createIntAttr(COLLECTION_ID, `ksdo_${i}`, false, 1, 5);

  // 9. Aggression-3, Impulsivität-2, Neurotizismus-3
  for (let i = 1; i <= 3; i++) await createIntAttr(COLLECTION_ID, `agg_${i}`, false, 1, 5);
  for (let i = 1; i <= 2; i++) await createIntAttr(COLLECTION_ID, `imp_${i}`, false, 1, 5);
  for (let i = 1; i <= 3; i++) await createIntAttr(COLLECTION_ID, `neu_${i}`, false, 1, 5);

  // 10. Lifestyle (named fields from config.yaml)
  for (const key of ["sauberkeit", "gemeinschaft", "besucher", "laerm_toleranz", "struktur", "teilen", "selbst_sauberkeit"]) {
    await createIntAttr(COLLECTION_ID, key, false, 1, 5);
  }
  await createStringAttr(COLLECTION_ID, "tagesrhythmus", 20); // "schicht"|"buero"|"homeoffice"

  // 11. UCLA-6 (outcome variable — not used in matching)
  for (let i = 1; i <= 6; i++) await createIntAttr(COLLECTION_ID, `ucla_${i}`, false, 1, 5);

  // 12. ClaVis link + coordinates + radius
  await createStringAttr(COLLECTION_ID, "clavisId", 36);  // ClaVis export ID — used as document $id
  await createStringAttr(COLLECTION_ID, "tan", 10);        // study TAN (used for demo login email)
  await createFloatAttr(COLLECTION_ID, "wohnort_lat", false, -90, 90);
  await createFloatAttr(COLLECTION_ID, "wohnort_lon", false, -180, 180);
  await createIntAttr(COLLECTION_ID, "radius_km", false, 0, 200);

  // 13. ClaVis CORE scores (populated by import script, not by survey)
  await createIntAttr(COLLECTION_ID, "clavis_s", false, 0, 100);
  await createIntAttr(COLLECTION_ID, "clavis_a", false, 0, 100);
  await createIntAttr(COLLECTION_ID, "clavis_o", false, 0, 100);
  await createIntAttr(COLLECTION_ID, "clavis_p", false, 0, 100);
  await createIntAttr(COLLECTION_ID, "clavis_sicherheit", false, 0, 100);
  await createIntAttr(COLLECTION_ID, "clavis_stimulation", false, 0, 100);

  // 14. New survey fields (Umfrage.docx — single source of truth)

  // Step 2: Demographische Angaben
  await createBoolAttr(COLLECTION_ID, "kinder", false, false);
  await createIntAttr(COLLECTION_ID, "kinder_anzahl", false, 1, 10);
  await createStringAttr(COLLECTION_ID, "bildungsstand", 50);
  await createBoolAttr(COLLECTION_ID, "sprache_deutsch", false, true);
  await createStringAttr(COLLECTION_ID, "sprache_niveau", 5);
  await createStringAttr(COLLECTION_ID, "haustiere_art", 100);

  // Step 3: Standort & Wohnpräferenzen
  await createStringAttr(COLLECTION_ID, "wohnort_stadt", 100);
  await createStringAttr(COLLECTION_ID, "einzug_datum", 20);

  // Step 4: Einsamkeit (E1–E6) + Forschungsfragen (ZE1–ZE2) + Stress (S1–S5)
  for (let i = 1; i <= 6; i++) await createIntAttr(COLLECTION_ID, `e${i}`, false, 1, 5);
  await createStringAttr(COLLECTION_ID, "ze1", 5);
  await createStringAttr(COLLECTION_ID, "ze2", 5);
  for (let i = 1; i <= 5; i++) await createIntAttr(COLLECTION_ID, `s${i}`, false, 1, 5);

  // Step 5: Resilienz (R1–R5) + Autoritarismus (PA1–PA4) + Soziale Dominanz (PD1–PD3)
  for (let i = 1; i <= 5; i++) await createIntAttr(COLLECTION_ID, `r${i}`, false, 1, 5);
  for (let i = 1; i <= 4; i++) await createIntAttr(COLLECTION_ID, `pa${i}`, false, 1, 5);
  for (let i = 1; i <= 3; i++) await createIntAttr(COLLECTION_ID, `pd${i}`, false, 1, 5);

  // Step 6: Aggression (GA1–GA3) + Neurotizismus (GN1–GN3) + Closed Mindset (CM1–CM3)
  for (let i = 1; i <= 3; i++) await createIntAttr(COLLECTION_ID, `ga${i}`, false, 1, 5);
  for (let i = 1; i <= 3; i++) await createIntAttr(COLLECTION_ID, `gn${i}`, false, 1, 5);
  for (let i = 1; i <= 3; i++) await createIntAttr(COLLECTION_ID, `cm${i}`, false, 1, 5);

  // Step 7: Lebensstil — Eigenes Verhalten
  await createStringAttr(COLLECTION_ID, "gem_haeufigkeit", 30);
  await createIntAttr(COLLECTION_ID, "wg_unterstuetzung", false, 1, 5);
  await createIntAttr(COLLECTION_ID, "sauberkeit_wichtig", false, 1, 5);
  await createIntAttr(COLLECTION_ID, "ich_ordentlich", false, 1, 5);
  await createStringAttr(COLLECTION_ID, "eigene_lautstaerke", 30);
  await createStringAttr(COLLECTION_ID, "eigener_besuch", 30);
  await createStringAttr(COLLECTION_ID, "rauchen", 20);

  // Step 8: Erwartungen & Ausschlusskriterien
  await createStringAttr(COLLECTION_ID, "geschirr_wann", 30);
  await createStringAttr(COLLECTION_ID, "fremder_besuch", 30);
  await createStringAttr(COLLECTION_ID, "fremde_lautstaerke", 30);
  await createStringAttr(COLLECTION_ID, "laerm_empfindlichkeit", 40);
  await createStringAttr(COLLECTION_ID, "rauchen_toleranz", 20);
  await createStringAttr(COLLECTION_ID, "teilen_haltung", 30);
  await createStringAttr(COLLECTION_ID, "ausschluss_alter", 100);
  await createStringAttr(COLLECTION_ID, "ausschluss_geschlecht", 50);
  await createBoolAttr(COLLECTION_ID, "ausschluss_kinder", false, false);
  await createStringAttr(COLLECTION_ID, "mindest_bildung", 50);

  // 15. Indexes
  await createIndex(COLLECTION_ID, "userId_idx", ["userId"]);
  await createIndex(COLLECTION_ID, "clavisId_idx", ["clavisId"]);

  console.log("\n✅  Done! All attributes created.\n");
  console.log("Next steps:");
  console.log("  1. In Appwrite Console → Auth → Settings: enable Email/Password sign-in");
  console.log("  2. Run: python3 scripts/seed_participants.py   (seeds 50 demo participants)");
  console.log("  3. Run `pnpm dev` and open http://localhost:3000/login\n");
}

main().catch((e) => {
  console.error("\n❌  Fatal:", e.message);
  process.exit(1);
});
