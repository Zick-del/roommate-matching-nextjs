import { z } from "zod";

const l5 = () => z.number().int().min(1).max(5);

// Step 1 — Persönliche Angaben
export const step1Schema = z.object({
  anzeigename: z.string().min(1, "Bitte gib deinen Anzeigenamen ein"),
  gender: z.enum(["m", "f", "d"], { message: "Bitte wähle dein Geschlecht" }),
  age: z
    .number({ message: "Bitte gib dein Alter ein" })
    .int()
    .min(18, "Du musst mindestens 18 Jahre alt sein")
    .max(99),
  rolle: z.enum(["suchend", "anbietend"], { message: "Bitte wähle deine Rolle" }),
});

// Step 2 — Wohnpräferenzen
export const step2Schema = z
  .object({
    budget_min: z
      .number({ message: "Bitte gib ein Budget ein" })
      .int()
      .min(0)
      .max(10000),
    budget_max: z
      .number({ message: "Bitte gib ein Budget ein" })
      .int()
      .min(0)
      .max(10000),
    location: z.string().min(1, "Bitte gib deinen Wohnort ein"),
    einzug_fruehestens: z
      .string()
      .min(1, "Bitte wähle ein frühestes Einzugsdatum"),
    einzug_spaetestens: z
      .string()
      .min(1, "Bitte wähle ein spätestes Einzugsdatum"),
    raucher: z.enum(["ja", "nein"], { message: "Pflichtfeld" }),
    raucher_toleranz: z.enum(["ja", "nein", "egal"], { message: "Pflichtfeld" }),
    haustiere: z.enum(["ja", "nein"], { message: "Pflichtfeld" }),
    haustiere_toleranz: z.enum(["ja", "nein", "egal"], {
      message: "Pflichtfeld",
    }),
    nur_frauen_wg: z.boolean(),
  })
  .refine((d) => d.budget_max >= d.budget_min, {
    message: "Muss größer oder gleich dem Mindestbudget sein",
    path: ["budget_max"],
  });

// Step 3 — Stress (PSS-5)
export const step3Schema = z.object({
  pss_1: l5(),
  pss_2: l5(),
  pss_3: l5(),
  pss_4: l5(),
  pss_5: l5(),
});

// Step 4 — Resilienz (RS-5)
export const step4Schema = z.object({
  rs_1: l5(),
  rs_2: l5(),
  rs_3: l5(),
  rs_4: l5(),
  rs_5: l5(),
});

// Step 5 — Werte (KSA-5 + KSDO-3)
export const step5Schema = z.object({
  ksa_1: l5(),
  ksa_2: l5(),
  ksa_3: l5(),
  ksa_4: l5(),
  ksa_5: l5(),
  ksdo_1: l5(),
  ksdo_2: l5(),
  ksdo_3: l5(),
});

// Step 6 — Persönlichkeit (Agg-3, Imp-2, Neu-3)
export const step6Schema = z.object({
  agg_1: l5(),
  agg_2: l5(),
  agg_3: l5(),
  imp_1: l5(),
  imp_2: l5(),
  neu_1: l5(),
  neu_2: l5(),
  neu_3: l5(),
});

// Step 7 — Lifestyle + Tagesrhythmus + UCLA-6
export const step7Schema = z.object({
  sauberkeit: l5(),
  gemeinschaft: l5(),
  besucher: l5(),
  laerm_toleranz: l5(),
  struktur: l5(),
  teilen: l5(),
  selbst_sauberkeit: l5(),
  tagesrhythmus: z.enum(["schicht", "buero", "homeoffice"], {
    message: "Bitte wähle deinen Tagesrhythmus",
  }),
  ucla_1: l5(),
  ucla_2: l5(),
  ucla_3: l5(),
  ucla_4: l5(),
  ucla_5: l5(),
  ucla_6: l5(),
});

export const STEP_SCHEMAS = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
] as const;

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type Step5Data = z.infer<typeof step5Schema>;
export type Step6Data = z.infer<typeof step6Schema>;
export type Step7Data = z.infer<typeof step7Schema>;
