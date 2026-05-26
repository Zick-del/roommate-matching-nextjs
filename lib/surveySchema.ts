import { z } from "zod";

const rf = (msg = "Pflichtfeld") => ({ message: msg });
const l5 = () => z.number(rf()).int().min(1, "Bitte auswählen").max(5);

// ─── Schritt 1: Einleitung & Rolle ──────────────────────────────────────────
export const step1Schema = z.object({
  anzeigename: z.string(rf()).min(2, "Mindestens 2 Zeichen"),
  rolle: z.enum(["suchend", "anbietend", "freiwillig"], rf()),
  age: z.number(rf()).int().min(18, "Mindestalter: 18 Jahre").max(99),
  gender: z.enum(["m", "w", "d"], rf()),
});
export type Step1Data = z.infer<typeof step1Schema>;

// ─── Schritt 2: Demographische Angaben ──────────────────────────────────────
export const step2Schema = z.object({
  kinder: z.boolean(),
  kinder_anzahl: z.number().int().min(1).max(10).optional(),
  bildungsstand: z.enum(
    ["kein_abschluss", "hauptschule", "realschule", "abitur", "ausbildung", "bachelor", "master", "promotion"],
    rf()
  ),
  sprache_deutsch: z.boolean(),
  sprache_niveau: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  haustiere: z.enum(["ja", "nein"], rf()),
  haustiere_art: z.string().max(100).optional(),
});
export type Step2Data = z.infer<typeof step2Schema>;

// ─── Schritt 3: Standort & Wohnpräferenzen ──────────────────────────────────
export const step3Schema = z
  .object({
    wohnort_stadt: z.string(rf()).min(2, "Bitte Ort eingeben"),
    wohnort_radius: z.number(rf()).int().min(1).max(200),
    budget_min: z.number(rf()).int().min(0).max(10000),
    budget_max: z.number(rf()).int().min(0).max(10000),
    einzug_datum: z.string().optional(),
  })
  .refine((d) => d.budget_max >= d.budget_min, {
    message: "Maximalbudget muss ≥ Mindestbudget sein",
    path: ["budget_max"],
  });
export type Step3Data = z.infer<typeof step3Schema>;

// ─── Schritt 4: Einsamkeit & Stress ─────────────────────────────────────────
export const step4Schema = z.object({
  e1: l5(), e2: l5(), e3: l5(), e4: l5(), e5: l5(), e6: l5(),
  ze1: z.enum(["ja", "nein"], rf()),
  ze2: z.enum(["ja", "nein"], rf()),
  s1: l5(), s2: l5(), s3: l5(), s4: l5(), s5: l5(),
});
export type Step4Data = z.infer<typeof step4Schema>;

// ─── Schritt 5: Resilienz & Politische Orientierung ─────────────────────────
export const step5Schema = z.object({
  r1: l5(), r2: l5(), r3: l5(), r4: l5(), r5: l5(),
  pa1: l5(), pa2: l5(), pa3: l5(), pa4: l5(),
  pd1: l5(), pd2: l5(), pd3: l5(),
});
export type Step5Data = z.infer<typeof step5Schema>;

// ─── Schritt 6: Persönlichkeit & Closed Mindset ─────────────────────────────
export const step6Schema = z.object({
  ga1: l5(), ga2: l5(), ga3: l5(),
  gn1: l5(), gn2: l5(), gn3: l5(),
  cm1: l5(), cm2: l5(), cm3: l5(),
});
export type Step6Data = z.infer<typeof step6Schema>;

// ─── Schritt 7: Lebensstil — Eigenes Verhalten ──────────────────────────────
export const step7Schema = z.object({
  gem_haeufigkeit: z.enum(["nie", "monatlich", "woechentlich", "mehrmals", "flexibel"], rf()),
  wg_unterstuetzung: l5(),
  sauberkeit_wichtig: l5(),
  ich_ordentlich: l5(),
  eigene_lautstaerke: z.enum(["ruhig", "manchmal", "gelegentlich", "haeufig", "unterschiedlich"], rf()),
  eigener_besuch: z.enum(["selten", "gelegentlich", "mehrmals_woche", "haeufig_spontan", "unterschiedlich"], rf()),
  rauchen: z.enum(["nein", "nur_draussen", "balkon", "zimmer", "wohnung"], rf()),
  tagesrhythmus: z.enum(["buero", "homeoffice", "schicht"], rf()),
});
export type Step7Data = z.infer<typeof step7Schema>;

// ─── Schritt 8: Erwartungen & Ausschlusskriterien ───────────────────────────
export const step8Schema = z.object({
  geschirr_wann: z.enum(["sofort", "selber_abend", "naechster_morgen", "ein_zwei_tage", "egal"], rf()),
  fremder_besuch: z.enum(["selten", "gelegentlich", "mehrmals_woche", "haeufig_spontan", "egal"], rf()),
  fremde_lautstaerke: z.enum(["selten", "gelegentlich", "wochenende", "haeufig", "sehr_haeufig"], rf()),
  laerm_empfindlichkeit: z.enum(["sehr_empfindlich", "nur_wochenende", "ruhezeiten", "selten_stoerend", "gar_nicht"], rf()),
  rauchen_toleranz: z.enum(["nein", "nur_draussen", "balkon", "zimmer", "wohnung"], rf()),
  haustiere_toleranz: z.enum(["ja", "nein", "mit_ausnahme"], rf()),
  teilen_haltung: z.enum(["nicht_gerne", "nicht_ok", "kleinigkeiten_ok", "alles_teilen", "egal"], rf()),
  ausschluss_alter: z.string().max(100).optional(),
  ausschluss_geschlecht: z.string().max(50).optional(),
  ausschluss_kinder: z.boolean().optional(),
  mindest_bildung: z.enum(
    ["egal", "hauptschule", "realschule", "abitur", "ausbildung", "bachelor", "master", "promotion"],
    rf()
  ),
});
export type Step8Data = z.infer<typeof step8Schema>;

export const STEP_SCHEMAS = [
  step1Schema, step2Schema, step3Schema, step4Schema,
  step5Schema, step6Schema, step7Schema, step8Schema,
] as const;
