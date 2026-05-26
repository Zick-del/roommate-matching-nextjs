"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getCurrentUser,
  getParticipantByUserId,
  saveParticipantStep,
  markSurveyDone,
} from "@/lib/appwrite";
import type { ParticipantDoc } from "@/lib/appwrite";
import type { DefaultValues } from "react-hook-form";
import {
  step1Schema, step2Schema, step3Schema, step4Schema,
  step5Schema, step6Schema, step7Schema, step8Schema,
  type Step1Data, type Step2Data, type Step3Data, type Step4Data,
  type Step5Data, type Step6Data, type Step7Data, type Step8Data,
} from "@/lib/surveySchema";
import { SurveyStep } from "@/components/survey/SurveyStep";
import { LikertScale } from "@/components/survey/LikertScale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function SelectField({
  label, options, value, onChange, error,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (v: string | null) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select onValueChange={onChange} value={value ?? ""}>
        <SelectTrigger><SelectValue placeholder="Bitte wählen…" /></SelectTrigger>
        <SelectContent className="w-auto">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError msg={error} />
    </div>
  );
}

function YesNoField({
  question, value, onChange, error,
}: {
  question: string;
  value: string | undefined;
  onChange: (v: "ja" | "nein") => void;
  error?: string;
}) {
  return (
    <div className="space-y-2 py-1">
      <p className="text-sm leading-relaxed">{question}</p>
      <div className="flex gap-3">
        {(["ja", "nein"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-full px-6 py-1.5 text-sm font-medium transition-colors",
              value === opt
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {opt === "ja" ? "Ja" : "Nein"}
          </button>
        ))}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

// ─── Item arrays (source of truth: Umfrage.docx) ─────────────────────────────

const E_ITEMS = [
  "Es fehlt mir an Menschen, die ich um Unterstützung bitten kann.",
  "Ich fühle mich im Alltag oft allein.",
  "Ich bin gerne in Gesellschaft.",
  "Ich fühle mich sozial nicht gut eingebunden.",
  "Wenn ich möchte, finde ich leicht Anschluss.",
  "Es gibt Menschen, mit denen ich mich austauschen kann.",
];

const S_ITEMS = [
  "Ich fühle mich im Alltag gestresst.",
  "Ich habe das Gefühl, meine Probleme lösen zu können.",
  "Ich habe das Gefühl, dass mich viele Dinge gleichzeitig belasten.",
  "Ich fühle mich im Alltag überfordert.",
  "Ich habe mein Leben gut im Griff.",
];

const R_ITEMS = [
  "Ich setze mir Ziele und bleibe dran, bis ich sie erreiche.",
  "Auch bei Rückschlägen bleibe ich innerlich stabil.",
  "Ich komme auch mit mehreren gleichzeitigen Anforderungen gut zurecht.",
  "Ich kann Herausforderungen aus verschiedenen Blickwinkeln betrachten.",
  "In schwierigen Situationen finde ich eine Lösung.",
];

const PA_ITEMS = [
  "Wenn sich eine Person dauerhaft störend verhält, sollte sie klare Konsequenzen spüren.",
  "Bewährte Regeln und Traditionen sind wichtig für das Zusammenleben.",
  "In schwierigen Situationen sollten starke Führungspersonen Entscheidungen treffen.",
  "Starke Führung ist wichtig, damit gesellschaftliche Probleme gelöst werden können.",
];

const PD_ITEMS = [
  "In einer Gesellschaft ist es normal, dass manche Gruppen mehr Einfluss haben als andere.",
  "Es ist nicht notwendig, dass alle Gruppen völlig gleichgestellt sind.",
  "Alle sozialen Gruppen sollten die gleichen Chancen erhalten.",
];

const GA_ITEMS = [
  "Ich rege mich manchmal schon über Kleinigkeiten schnell auf.",
  "Wenn ich wütend bin, fällt es mir schwer, ruhig zu bleiben.",
  "Bei Meinungsverschiedenheiten gerate ich schnell in Streit.",
];

const GN_ITEMS = [
  "Meine Stimmung kann sich schnell ändern.",
  "Auch in schwierigen Situationen bleibe ich meist ruhig.",
  "Ich bin schnell gereizt oder genervt.",
];

const CM_ITEMS = [
  "Menschen können sich durch Erfahrungen, Lernen und persönliche Entwicklung nicht verändern.",
  "Menschen können sich grundsätzlich nur wenig ändern.",
  "Wie ein Mensch im Wesentlichen ist, bleibt gleich.",
];

// ─── Reusable LikertStepForm for pure-Likert steps ──────────────────────────

function LikertStepForm<T extends Record<string, number>>({
  schema, title, description, existing, userId, onDone, stepNum, sections,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  title: string;
  description?: string;
  existing: ParticipantDoc | null;
  userId: string;
  onDone: () => void;
  stepNum: number;
  sections: { title?: string; items: { key: string; label: string }[] }[];
}) {
  const router = useRouter();
  const allItems = sections.flatMap((s) => s.items);
  const defaults = Object.fromEntries(
    allItems.map((item) => [
      item.key,
      typeof existing?.[item.key] === "number" ? (existing[item.key] as number) : undefined,
    ])
  ) as DefaultValues<T>;

  const form = useForm<T>({ resolver: zodResolver(schema), defaultValues: defaults });

  async function onSubmit(data: T) {
    await saveParticipantStep(userId, {
      ...data,
      completedStep: Math.max(stepNum, (existing?.completedStep as number) ?? 0),
    });
    onDone();
  }

  return (
    <SurveyStep
      title={title}
      description={description}
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onBack={() => router.push(`/survey/${stepNum - 1}`)}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
    >
      {sections.map((section, idx) => (
        <div key={idx}>
          {idx > 0 && <Separator className="my-4" />}
          <Section title={section.title}>
            {section.items.map(({ key, label }) => (
              <Controller
                key={key}
                control={form.control}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                name={key as any}
                render={({ field, fieldState }) => (
                  <LikertScale
                    question={label}
                    value={field.value as number | undefined}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            ))}
          </Section>
        </div>
      ))}
    </SurveyStep>
  );
}

// ─── Step 1: Einleitung & Rolle ──────────────────────────────────────────────

function Step1Form({ existing, userId, onDone, stepNum }: FormProps) {
  const router = useRouter();
  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      anzeigename: (existing?.anzeigename as string) ?? "",
      rolle: (existing?.rolle as Step1Data["rolle"]) ?? undefined,
      age: (existing?.age as number) ?? undefined,
      gender: (existing?.gender as Step1Data["gender"]) ?? undefined,
    },
  });

  async function onSubmit(data: Step1Data) {
    await saveParticipantStep(userId, {
      ...data,
      completedStep: Math.max(stepNum, (existing?.completedStep as number) ?? 0),
    });
    onDone();
  }

  return (
    <SurveyStep
      title="Einleitung & Rolle"
      description="Sind Sie auf der Suche nach einer Wohnung oder suchen Sie nach einer Person, die bei Ihnen einzieht?"
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
      onBack={stepNum > 1 ? () => router.push(`/survey/${stepNum - 1}`) : undefined}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="anzeigename">Anzeigename</Label>
          <Input id="anzeigename" placeholder="z. B. Max M." {...form.register("anzeigename")} />
          <FieldError msg={form.formState.errors.anzeigename?.message} />
        </div>

        <Controller
          control={form.control}
          name="rolle"
          render={({ field, fieldState }) => (
            <SelectField
              label="Ich bin …"
              options={[
                { value: "suchend", label: "Wohnraumsuchend" },
                { value: "anbietend", label: "Wohnraumgebend / Suche nach Mitbewohnern" },
                { value: "freiwillig", label: "Freiwillige Teilnahme an der Umfrage" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="age">Alter</Label>
            <Input
              id="age"
              type="number"
              min={18}
              max={99}
              placeholder="25"
              {...form.register("age", { valueAsNumber: true })}
            />
            <FieldError msg={form.formState.errors.age?.message} />
          </div>

          <Controller
            control={form.control}
            name="gender"
            render={({ field, fieldState }) => (
              <SelectField
                label="Geschlecht"
                options={[
                  { value: "m", label: "Männlich" },
                  { value: "w", label: "Weiblich" },
                  { value: "d", label: "Divers" },
                ]}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </div>
    </SurveyStep>
  );
}

// ─── Step 2: Demographische Angaben ─────────────────────────────────────────

function Step2Form({ existing, userId, onDone, stepNum }: FormProps) {
  const router = useRouter();
  const form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      kinder: (existing?.kinder as boolean) ?? false,
      kinder_anzahl: (existing?.kinder_anzahl as number) ?? undefined,
      bildungsstand: (existing?.bildungsstand as Step2Data["bildungsstand"]) ?? undefined,
      sprache_deutsch: (existing?.sprache_deutsch as boolean) ?? true,
      sprache_niveau: (existing?.sprache_niveau as Step2Data["sprache_niveau"]) ?? undefined,
      haustiere: (existing?.haustiere as Step2Data["haustiere"]) ?? undefined,
      haustiere_art: (existing?.haustiere_art as string) ?? "",
    },
  });

  const watchKinder = form.watch("kinder");
  const watchDeutsch = form.watch("sprache_deutsch");
  const watchHaustiere = form.watch("haustiere") === "ja";

  async function onSubmit(data: Step2Data) {
    await saveParticipantStep(userId, {
      ...data,
      completedStep: Math.max(stepNum, (existing?.completedStep as number) ?? 0),
    });
    onDone();
  }

  const bildungsOptions = [
    { value: "kein_abschluss", label: "Kein Schulabschluss" },
    { value: "hauptschule", label: "Hauptschulabschluss" },
    { value: "realschule", label: "Realschulabschluss / Mittlere Reife" },
    { value: "abitur", label: "(Fach-)Abitur" },
    { value: "ausbildung", label: "Berufsausbildung" },
    { value: "bachelor", label: "Grundstudium / Bachelor" },
    { value: "master", label: "Diplom / Master" },
    { value: "promotion", label: "Promotion / Doktortitel" },
  ];

  return (
    <SurveyStep
      title="Demographische Angaben"
      description="Persönliche Informationen für die Matching-Auswertung."
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onBack={() => router.push(`/survey/${stepNum - 1}`)}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
    >
      <div className="space-y-5">
        <Controller
          control={form.control}
          name="bildungsstand"
          render={({ field, fieldState }) => (
            <SelectField
              label="Höchster Bildungsstand"
              options={bildungsOptions}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Separator />

        <Section title="Kinder">
          <Controller
            control={form.control}
            name="kinder"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox id="kinder" checked={field.value} onCheckedChange={field.onChange} />
                <Label htmlFor="kinder" className="cursor-pointer font-normal">
                  Ich habe Kinder
                </Label>
              </div>
            )}
          />
          {watchKinder && (
            <div className="space-y-1.5">
              <Label htmlFor="kinder_anzahl">Anzahl Kinder</Label>
              <Input
                id="kinder_anzahl"
                type="number"
                min={1}
                max={10}
                placeholder="1"
                {...form.register("kinder_anzahl", { valueAsNumber: true })}
              />
              <FieldError msg={form.formState.errors.kinder_anzahl?.message} />
            </div>
          )}
        </Section>

        <Separator />

        <Section title="Haustiere">
          <Controller
            control={form.control}
            name="haustiere"
            render={({ field, fieldState }) => (
              <YesNoField
                question="Haben Sie Haustiere?"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          {watchHaustiere && (
            <div className="space-y-1.5">
              <Label htmlFor="haustiere_art">Welche Haustiere?</Label>
              <Input
                id="haustiere_art"
                placeholder="z. B. Hund, Katze"
                {...form.register("haustiere_art")}
              />
            </div>
          )}
        </Section>

        <Separator />

        <Section title="Sprachkenntnisse">
          <Controller
            control={form.control}
            name="sprache_deutsch"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox id="sprache_deutsch" checked={field.value} onCheckedChange={field.onChange} />
                <Label htmlFor="sprache_deutsch" className="cursor-pointer font-normal">
                  Ich spreche Deutsch
                </Label>
              </div>
            )}
          />
          {watchDeutsch && (
            <Controller
              control={form.control}
              name="sprache_niveau"
              render={({ field, fieldState }) => (
                <SelectField
                  label="Deutschniveau"
                  options={[
                    { value: "A1", label: "A1 – Anfänger" },
                    { value: "A2", label: "A2 – Grundlegende Kenntnisse" },
                    { value: "B1", label: "B1 – Mittelstufe" },
                    { value: "B2", label: "B2 – Gute Mittelstufe" },
                    { value: "C1", label: "C1 – Fortgeschritten" },
                    { value: "C2", label: "C2 – Fließend / Muttersprache" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          )}
        </Section>
      </div>
    </SurveyStep>
  );
}

// ─── Step 3: Standort & Wohnpräferenzen ─────────────────────────────────────

function Step3Form({ existing, userId, onDone, stepNum }: FormProps) {
  const router = useRouter();
  const form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      wohnort_stadt: (existing?.wohnort_stadt as string) ?? (existing?.location as string) ?? "",
      wohnort_radius: (existing?.wohnort_radius as number) ?? 15,
      budget_min: (existing?.budget_min as number) ?? undefined,
      budget_max: (existing?.budget_max as number) ?? undefined,
      einzug_datum: (existing?.einzug_datum as string) ?? "",
    },
  });

  async function onSubmit(data: Step3Data) {
    await saveParticipantStep(userId, {
      ...data,
      completedStep: Math.max(stepNum, (existing?.completedStep as number) ?? 0),
    });
    onDone();
  }

  return (
    <SurveyStep
      title="Standort & Wohnpräferenzen"
      description="Wo suchen Sie, und was sind Ihre Anforderungen?"
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onBack={() => router.push(`/survey/${stepNum - 1}`)}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="wohnort_stadt">Stadt / Ort</Label>
          <Input
            id="wohnort_stadt"
            placeholder="z. B. Hamburg"
            {...form.register("wohnort_stadt")}
          />
          <FieldError msg={form.formState.errors.wohnort_stadt?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wohnort_radius">
            Maximale Entfernung vom Wunschort (km)
          </Label>
          <Input
            id="wohnort_radius"
            type="number"
            min={1}
            max={200}
            placeholder="15"
            {...form.register("wohnort_radius", { valueAsNumber: true })}
          />
          <FieldError msg={form.formState.errors.wohnort_radius?.message} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget_min">Budget mindestens (€/Monat)</Label>
            <Input
              id="budget_min"
              type="number"
              min={0}
              placeholder="400"
              {...form.register("budget_min", { valueAsNumber: true })}
            />
            <FieldError msg={form.formState.errors.budget_min?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget_max">Budget maximal (€/Monat)</Label>
            <Input
              id="budget_max"
              type="number"
              min={0}
              placeholder="700"
              {...form.register("budget_max", { valueAsNumber: true })}
            />
            <FieldError msg={form.formState.errors.budget_max?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="einzug_datum">Einzug frühestens (optional)</Label>
          <Input id="einzug_datum" type="date" {...form.register("einzug_datum")} />
        </div>
      </div>
    </SurveyStep>
  );
}

// ─── Step 4: Einsamkeit & Stress ─────────────────────────────────────────────

function Step4Form({ existing, userId, onDone, stepNum }: FormProps) {
  const router = useRouter();
  const form = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      e1: (existing?.e1 as number) ?? undefined,
      e2: (existing?.e2 as number) ?? undefined,
      e3: (existing?.e3 as number) ?? undefined,
      e4: (existing?.e4 as number) ?? undefined,
      e5: (existing?.e5 as number) ?? undefined,
      e6: (existing?.e6 as number) ?? undefined,
      ze1: (existing?.ze1 as Step4Data["ze1"]) ?? undefined,
      ze2: (existing?.ze2 as Step4Data["ze2"]) ?? undefined,
      s1: (existing?.s1 as number) ?? undefined,
      s2: (existing?.s2 as number) ?? undefined,
      s3: (existing?.s3 as number) ?? undefined,
      s4: (existing?.s4 as number) ?? undefined,
      s5: (existing?.s5 as number) ?? undefined,
    },
  });

  async function onSubmit(data: Step4Data) {
    await saveParticipantStep(userId, {
      ...data,
      completedStep: Math.max(stepNum, (existing?.completedStep as number) ?? 0),
    });
    onDone();
  }

  return (
    <SurveyStep
      title="Persönliche Einschätzungen"
      description="Bitte bewerten Sie, inwieweit die folgenden Aussagen auf Sie zutreffen."
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onBack={() => router.push(`/survey/${stepNum - 1}`)}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
    >
      <Section>
        {E_ITEMS.map((label, i) => (
          <Controller
            key={`e${i + 1}`}
            control={form.control}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name={`e${i + 1}` as any}
            render={({ field, fieldState }) => (
              <LikertScale
                question={label}
                value={field.value as number | undefined}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        ))}
      </Section>

      <Separator className="my-4" />

      <Section>
        <Controller
          control={form.control}
          name="ze1"
          render={({ field, fieldState }) => (
            <YesNoField
              question="Wünschen Sie sich in Ihrem Alltag mehr soziale Kontakte und täglich Gesellschaft?"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="ze2"
          render={({ field, fieldState }) => (
            <YesNoField
              question="Glauben Sie, dass ein Algorithmus, der auf psychologischer Passung basiert, die Einsamkeit effektiver senken kann als eine Zufalls-WG?"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </Section>

      <Separator className="my-4" />

      <Section>
        {S_ITEMS.map((label, i) => (
          <Controller
            key={`s${i + 1}`}
            control={form.control}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name={`s${i + 1}` as any}
            render={({ field, fieldState }) => (
              <LikertScale
                question={label}
                value={field.value as number | undefined}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        ))}
      </Section>
    </SurveyStep>
  );
}

// ─── Step 5: Resilienz & Politische Orientierung (pure Likert) ───────────────

function Step5Form(props: FormProps) {
  return (
    <LikertStepForm<Step5Data>
      {...props}
      schema={step5Schema}
      title="Einstellungen & Werte"
      description="Bitte bewerten Sie, inwieweit die folgenden Aussagen auf Sie zutreffen."
      sections={[
        {
          items: R_ITEMS.map((label, i) => ({ key: `r${i + 1}`, label })),
        },
        {
          items: PA_ITEMS.map((label, i) => ({ key: `pa${i + 1}`, label })),
        },
        {
          items: PD_ITEMS.map((label, i) => ({ key: `pd${i + 1}`, label })),
        },
      ]}
    />
  );
}

// ─── Step 6: Persönlichkeit & Closed Mindset (pure Likert) ──────────────────

function Step6Form(props: FormProps) {
  return (
    <LikertStepForm<Step6Data>
      {...props}
      schema={step6Schema}
      title="Selbsteinschätzung"
      description="Bitte bewerten Sie, inwieweit die folgenden Aussagen auf Sie zutreffen."
      sections={[
        {
          items: GA_ITEMS.map((label, i) => ({ key: `ga${i + 1}`, label })),
        },
        {
          items: GN_ITEMS.map((label, i) => ({ key: `gn${i + 1}`, label })),
        },
        {
          items: CM_ITEMS.map((label, i) => ({ key: `cm${i + 1}`, label })),
        },
      ]}
    />
  );
}

// ─── Step 7: Lebensstil — Eigenes Verhalten ──────────────────────────────────

function Step7Form({ existing, userId, onDone, stepNum }: FormProps) {
  const router = useRouter();
  const form = useForm<Step7Data>({
    resolver: zodResolver(step7Schema),
    defaultValues: {
      gem_haeufigkeit: (existing?.gem_haeufigkeit as Step7Data["gem_haeufigkeit"]) ?? undefined,
      wg_unterstuetzung: (existing?.wg_unterstuetzung as number) ?? undefined,
      sauberkeit_wichtig: (existing?.sauberkeit_wichtig as number) ?? undefined,
      ich_ordentlich: (existing?.ich_ordentlich as number) ?? undefined,
      eigene_lautstaerke: (existing?.eigene_lautstaerke as Step7Data["eigene_lautstaerke"]) ?? undefined,
      eigener_besuch: (existing?.eigener_besuch as Step7Data["eigener_besuch"]) ?? undefined,
      rauchen: (existing?.rauchen as Step7Data["rauchen"]) ?? undefined,
      tagesrhythmus: (existing?.tagesrhythmus as Step7Data["tagesrhythmus"]) ?? undefined,
    },
  });

  async function onSubmit(data: Step7Data) {
    await saveParticipantStep(userId, {
      ...data,
      completedStep: Math.max(stepNum, (existing?.completedStep as number) ?? 0),
    });
    onDone();
  }

  return (
    <SurveyStep
      title="Lebensstil — Eigenes Verhalten"
      description="Wie leben Sie im Alltag?"
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onBack={() => router.push(`/survey/${stepNum - 1}`)}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
    >
      <Section title="Gemeinschaft & Erwartungen">
        <Controller
          control={form.control}
          name="gem_haeufigkeit"
          render={({ field, fieldState }) => (
            <SelectField
              label="Wie oft möchten Sie gemeinsam Zeit mit Mitbewohner:innen verbringen?"
              options={[
                { value: "nie", label: "Nie" },
                { value: "monatlich", label: "1–2 Mal im Monat" },
                { value: "woechentlich", label: "1 Mal pro Woche" },
                { value: "mehrmals", label: "Mehrmals pro Woche" },
                { value: "flexibel", label: "Flexibel" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="wg_unterstuetzung"
          render={({ field, fieldState }) => (
            <LikertScale
              question="Ich erwarte in einer WG gegenseitige Unterstützung im Alltag."
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="sauberkeit_wichtig"
          render={({ field, fieldState }) => (
            <LikertScale
              question="Mir ist es wichtig, gemeinsam genutzte Räume sauber zu halten."
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </Section>

      <Separator className="my-4" />

      <Section title="Eigenes Verhalten">
        <Controller
          control={form.control}
          name="ich_ordentlich"
          render={({ field, fieldState }) => (
            <LikertScale
              question="Ich würde mich als sehr ordentlich und sauber beschreiben."
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="eigene_lautstaerke"
          render={({ field, fieldState }) => (
            <SelectField
              label="Wie laut sind Sie selbst im Alltag zu Hause?"
              options={[
                { value: "ruhig", label: "Eher ruhig" },
                { value: "manchmal", label: "Manchmal etwas lauter" },
                { value: "gelegentlich", label: "Gelegentlich laut" },
                { value: "haeufig", label: "Häufiger laut" },
                { value: "unterschiedlich", label: "Sehr unterschiedlich" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="eigener_besuch"
          render={({ field, fieldState }) => (
            <SelectField
              label="Wie häufig bekommen Sie selbst Besuch?"
              options={[
                { value: "selten", label: "Selten" },
                { value: "gelegentlich", label: "Gelegentlich" },
                { value: "mehrmals_woche", label: "Mehrmals pro Woche" },
                { value: "haeufig_spontan", label: "Häufig, auch spontan" },
                { value: "unterschiedlich", label: "Unterschiedlich / kommt darauf an" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </Section>

      <Separator className="my-4" />

      <Section title="Rauchen & Tagesrhythmus">
        <Controller
          control={form.control}
          name="rauchen"
          render={({ field, fieldState }) => (
            <SelectField
              label="Sind Sie Raucher:in? Wenn ja, wo rauchen Sie?"
              options={[
                { value: "nein", label: "Nein" },
                { value: "nur_draussen", label: "Ja, nur draußen" },
                { value: "balkon", label: "Ja, auf dem Balkon" },
                { value: "zimmer", label: "Ja, im eigenen Zimmer" },
                { value: "wohnung", label: "Ja, in der gesamten Wohnung" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="tagesrhythmus"
          render={({ field, fieldState }) => (
            <SelectField
              label="Wie sieht Ihr typischer Tagesrhythmus aus?"
              options={[
                { value: "buero", label: "Arbeit tagsüber primär im Büro" },
                { value: "homeoffice", label: "Arbeit tagsüber primär von Zuhause" },
                { value: "schicht", label: "Schichtdienst (wechselnde Zeiten)" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </Section>
    </SurveyStep>
  );
}

// ─── Step 8: Erwartungen & Ausschlusskriterien ───────────────────────────────

function Step8Form({ existing, userId, onDone, stepNum }: FormProps) {
  const router = useRouter();
  const form = useForm<Step8Data>({
    resolver: zodResolver(step8Schema),
    defaultValues: {
      geschirr_wann: (existing?.geschirr_wann as Step8Data["geschirr_wann"]) ?? undefined,
      fremder_besuch: (existing?.fremder_besuch as Step8Data["fremder_besuch"]) ?? undefined,
      fremde_lautstaerke: (existing?.fremde_lautstaerke as Step8Data["fremde_lautstaerke"]) ?? undefined,
      laerm_empfindlichkeit: (existing?.laerm_empfindlichkeit as Step8Data["laerm_empfindlichkeit"]) ?? undefined,
      rauchen_toleranz: (existing?.rauchen_toleranz as Step8Data["rauchen_toleranz"]) ?? undefined,
      haustiere_toleranz: (existing?.haustiere_toleranz as Step8Data["haustiere_toleranz"]) ?? undefined,
      teilen_haltung: (existing?.teilen_haltung as Step8Data["teilen_haltung"]) ?? undefined,
      ausschluss_alter: (existing?.ausschluss_alter as string) ?? "",
      ausschluss_geschlecht: (existing?.ausschluss_geschlecht as string) ?? "",
      ausschluss_kinder: (existing?.ausschluss_kinder as boolean) ?? false,
      mindest_bildung: (existing?.mindest_bildung as Step8Data["mindest_bildung"]) ?? undefined,
    },
  });

  async function onSubmit(data: Step8Data) {
    await saveParticipantStep(userId, { ...data, completedStep: TOTAL_STEPS });
    await markSurveyDone(userId);
    router.push("/results");
  }

  const rauchenOptions = [
    { value: "nein", label: "Kein Rauchen" },
    { value: "nur_draussen", label: "Nur draußen" },
    { value: "balkon", label: "Balkon" },
    { value: "zimmer", label: "Im eigenen Zimmer" },
    { value: "wohnung", label: "Gesamte Wohnung" },
  ];

  const bildungsOptions = [
    { value: "egal", label: "Ist mir egal" },
    { value: "hauptschule", label: "Hauptschulabschluss" },
    { value: "realschule", label: "Realschulabschluss" },
    { value: "abitur", label: "(Fach-)Abitur" },
    { value: "ausbildung", label: "Berufsausbildung" },
    { value: "bachelor", label: "Grundstudium / Bachelor" },
    { value: "master", label: "Diplom / Master" },
    { value: "promotion", label: "Promotion / Doktortitel" },
  ];

  return (
    <SurveyStep
      title="Erwartungen & Ausschlusskriterien"
      description="Was erwarten Sie von Ihren Mitbewohner:innen?"
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onBack={() => router.push(`/survey/${stepNum - 1}`)}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
      isLastStep
    >
      <Section title="Erwartungen an Mitbewohner:innen">
        <Controller
          control={form.control}
          name="geschirr_wann"
          render={({ field, fieldState }) => (
            <SelectField
              label="Benutztes Geschirr in der Küche sollte spätestens weggeräumt sein …"
              options={[
                { value: "sofort", label: "Sofort" },
                { value: "selber_abend", label: "Am selben Abend" },
                { value: "naechster_morgen", label: "Bis zum nächsten Morgen" },
                { value: "ein_zwei_tage", label: "Innerhalb von 1–2 Tagen" },
                { value: "egal", label: "Stört mich kaum" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="fremder_besuch"
          render={({ field, fieldState }) => (
            <SelectField
              label="Wie häufig wäre Besuch von Mitbewohner:innen für Sie in Ordnung?"
              options={[
                { value: "selten", label: "Selten" },
                { value: "gelegentlich", label: "Gelegentlich" },
                { value: "mehrmals_woche", label: "Mehrmals pro Woche" },
                { value: "haeufig_spontan", label: "Häufig, auch spontan" },
                { value: "egal", label: "Egal" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="fremde_lautstaerke"
          render={({ field, fieldState }) => (
            <SelectField
              label="Wie häufig darf es in der Wohnung auch mal lauter werden?"
              options={[
                { value: "selten", label: "Selten" },
                { value: "gelegentlich", label: "Gelegentlich" },
                { value: "wochenende", label: "Am Wochenende" },
                { value: "haeufig", label: "Häufig" },
                { value: "sehr_haeufig", label: "Sehr häufig" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="laerm_empfindlichkeit"
          render={({ field, fieldState }) => (
            <SelectField
              label="Stört es Sie, wenn es in der Wohnung mal lauter wird?"
              options={[
                { value: "sehr_empfindlich", label: "Ja, ich bin sehr geräuschempfindlich" },
                { value: "nur_wochenende", label: "Nein, solange es nur am Wochenende ist" },
                { value: "ruhezeiten", label: "Nein, solange Ruhezeiten eingehalten werden" },
                { value: "selten_stoerend", label: "Stört mich selten" },
                { value: "gar_nicht", label: "Stört mich gar nicht" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="rauchen_toleranz"
          render={({ field, fieldState }) => (
            <SelectField
              label="Welche Regelung zum Rauchen in der Wohnung wäre für Sie passend?"
              options={rauchenOptions}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="haustiere_toleranz"
          render={({ field, fieldState }) => (
            <SelectField
              label="Sind Sie offen dafür, dass Mitbewohner:innen Haustiere haben?"
              options={[
                { value: "ja", label: "Ja" },
                { value: "mit_ausnahme", label: "Ja, mit Ausnahme bestimmter Tiere" },
                { value: "nein", label: "Nein" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="teilen_haltung"
          render={({ field, fieldState }) => (
            <SelectField
              label="Ihr Salz wird von einem Mitbewohner / einer Mitbewohnerin einfach zum Kochen benutzt. Wie finden Sie das?"
              options={[
                { value: "nicht_gerne", label: "Ich teile nicht gerne" },
                { value: "nicht_ok", label: "Nicht in Ordnung, da nicht gefragt wurde" },
                { value: "kleinigkeiten_ok", label: "Bei Kleinigkeiten nicht schlimm" },
                { value: "alles_teilen", label: "Was meins ist, ist Deins!" },
                { value: "egal", label: "Ist mir egal" },
              ]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </Section>

      <Separator className="my-4" />

      <Section title="Ausschlusskriterien (optional)">
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          Sie können die Auswahl Ihrer Matches einschränken. Dies lässt sich im Nachhinein noch ändern.
        </p>

        <Controller
          control={form.control}
          name="mindest_bildung"
          render={({ field, fieldState }) => (
            <SelectField
              label="Welchen Bildungsstand sollte Ihr Match mindestens haben?"
              options={bildungsOptions}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <div className="space-y-1.5">
          <Label htmlFor="ausschluss_geschlecht">
            Schließen Sie ein bestimmtes Geschlecht aus? (z. B. „Männer" oder „leer lassen" für keine Einschränkung)
          </Label>
          <Input
            id="ausschluss_geschlecht"
            placeholder="Keine Einschränkung"
            {...form.register("ausschluss_geschlecht")}
          />
        </div>

        <Controller
          control={form.control}
          name="ausschluss_kinder"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="ausschluss_kinder"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="ausschluss_kinder" className="cursor-pointer font-normal">
                Kinder im Haushalt sind für mich ein Ausschlusskriterium
              </Label>
            </div>
          )}
        />
      </Section>
    </SurveyStep>
  );
}

// ─── Shared props type ───────────────────────────────────────────────────────

type FormProps = {
  existing: ParticipantDoc | null;
  userId: string;
  onDone: () => void;
  stepNum: number;
};

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SurveyPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step: stepParam } = use(params);
  const router = useRouter();
  const stepNum = parseInt(stepParam, 10);

  const [userId, setUserId] = useState<string | null>(null);
  const [existing, setExisting] = useState<ParticipantDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(stepNum) || stepNum < 1 || stepNum > TOTAL_STEPS) {
      router.replace("/survey/1");
      return;
    }
    (async () => {
      const user = await getCurrentUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.$id);
      const doc = await getParticipantByUserId(user.$id);
      setExisting(doc);
      setLoading(false);
    })();
  }, [stepNum, router]);

  if (loading || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  function goNext() {
    router.push(`/survey/${stepNum + 1}`);
  }

  const props: FormProps = { existing, userId, onDone: goNext, stepNum };

  if (stepNum === 1) return <Step1Form {...props} />;
  if (stepNum === 2) return <Step2Form {...props} />;
  if (stepNum === 3) return <Step3Form {...props} />;
  if (stepNum === 4) return <Step4Form {...props} />;
  if (stepNum === 5) return <Step5Form {...props} />;
  if (stepNum === 6) return <Step6Form {...props} />;
  if (stepNum === 7) return <Step7Form {...props} />;
  if (stepNum === 8) return <Step8Form {...props} />;

  return null;
}
