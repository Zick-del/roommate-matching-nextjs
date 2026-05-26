"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getCurrentUser, getParticipantByUserId, saveParticipantStep, markSurveyDone } from "@/lib/appwrite";
import type { ParticipantDoc } from "@/lib/appwrite";
import type { DefaultValues } from "react-hook-form";
import {
  step1Schema, step2Schema, step3Schema, step4Schema,
  step5Schema, step6Schema, step7Schema,
  type Step1Data, type Step2Data, type Step3Data, type Step4Data,
  type Step5Data, type Step6Data, type Step7Data,
} from "@/lib/surveySchema";
import { SurveyStep } from "@/components/survey/SurveyStep";
import { LikertScale } from "@/components/survey/LikertScale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const TOTAL_STEPS = 7;

// ─── Shared helpers ────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Step 1 ─────────────────────────────────────────────────────────────────

const PSS_ITEMS = [
  "Im letzten Monat: Wie oft haben Sie sich außerstande gefühlt, wichtige Dinge in Ihrem Leben zu kontrollieren?",
  "Im letzten Monat: Wie oft haben Sie sich sicher gefühlt, Ihre persönlichen Probleme bewältigen zu können?",
  "Im letzten Monat: Wie oft haben Sie sich nervös oder gestresst gefühlt?",
  "Im letzten Monat: Wie oft haben Sie Schwierigkeiten gehabt, sich von angesammeltem Stress zu erholen?",
  "Im letzten Monat: Wie oft hatten Sie das Gefühl, dass sich die Dinge nach Ihren Wünschen entwickeln?",
];

const RS_ITEMS = [
  "Wenn ich Pläne habe, verfolge ich sie auch.",
  "Normalerweise schaffe ich alles irgendwie.",
  "Mich interessieren viele Dinge.",
  "Ich bin stolz auf das, was ich geleistet habe.",
  "Ich gehe schwierige Situationen durch, weil ich glaube, dass ich es schaffen kann.",
];

const KSA_ITEMS = [
  "In unserer Gesellschaft brauchen wir starke Führungspersönlichkeiten, die klare Regeln vorgeben.",
  "Junge Menschen brauchen Disziplin und klare Grenzen, damit sie sich richtig entwickeln.",
  "Es ist wichtig, dass gesellschaftliche Strukturen und Hierarchien respektiert werden.",
  "Wer die geltenden Regeln nicht befolgt, sollte konsequent zur Rechenschaft gezogen werden.",
  "Eine starke, einheitliche Führung ist besser als viele unterschiedliche Meinungen.",
];

const KSDO_ITEMS = [
  "Einige Gruppen von Menschen sind für Führungspositionen besser geeignet als andere.",
  "Es ist normal, dass einige Gruppen mehr Macht haben als andere.",
  "Alle sozialen Gruppen sollten im Leben gleiche Chancen haben.",
];

const AGG_ITEMS = [
  "Wenn jemand mich provoziert, könnte ich schnell die Beherrschung verlieren.",
  "Ich gerate leicht in Streit, wenn andere Menschen mir nicht zustimmen.",
  "Wenn ich frustriert bin, zeige ich das auch deutlich.",
];

const IMP_ITEMS = [
  "Ich handle oft, ohne vorher lange nachzudenken.",
  "Ich treffe Entscheidungen spontan, ohne sie lange zu überlegen.",
];

const NEU_ITEMS = [
  "Ich fühle mich häufig ängstlich oder nervös.",
  "Ich bin mit mir und meinem Leben im Großen und Ganzen zufrieden.",
  "Ich mache mir oft Sorgen um verschiedene Dinge in meinem Leben.",
];

const LIFESTYLE_ITEMS: { key: keyof Step7Data; label: string }[] = [
  { key: "sauberkeit", label: "Mir ist es wichtig, dass gemeinsame Wohnräume stets sauber und ordentlich sind." },
  { key: "gemeinschaft", label: "Gemeinsame Aktivitäten mit Mitbewohnern (z. B. Kochen, Filmabend) sind mir wichtig." },
  { key: "besucher", label: "Ich empfange häufig Gäste oder Freunde bei mir zu Hause." },
  { key: "laerm_toleranz", label: "Geräusche und Lärm in der Wohnung stören mich kaum." },
  { key: "struktur", label: "Ich halte mich gerne an feste Routinen und Strukturen in meinem Alltag." },
  { key: "teilen", label: "Ich teile gerne Haushaltsgegenstände oder Lebensmittel mit meinen Mitbewohnern." },
  { key: "selbst_sauberkeit", label: "Ich reinige meinen eigenen Wohnbereich regelmäßig und halte ihn in Ordnung." },
];

const UCLA_ITEMS = [
  "Wie oft hatten Sie das Gefühl, keine engen Beziehungen zu anderen Menschen zu haben?",
  "Wie oft fühlten Sie sich einsam?",
  "Wie oft hatten Sie das Gefühl, Teil einer Gruppe von Freunden zu sein?",
  "Wie oft hatten Sie das Gefühl, mit anderen Menschen nicht viel gemeinsam zu haben?",
  "Wie oft hatten Sie das Gefühl, von anderen Menschen verstanden zu werden?",
  "Wie oft hatten Sie das Gefühl, von anderen abgeschnitten oder isoliert zu sein?",
];

// ─── Step form components ────────────────────────────────────────────────────

function Step1Form({
  existing,
  userId,
  onDone,
  stepNum,
}: {
  existing: ParticipantDoc | null;
  userId: string;
  onDone: () => void;
  stepNum: number;
}) {
  const router = useRouter();
  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      anzeigename: (existing?.anzeigename as string) ?? "",
      gender: (existing?.gender as Step1Data["gender"]) ?? undefined,
      age: (existing?.age as number) ?? undefined,
      rolle: (existing?.rolle as Step1Data["rolle"]) ?? undefined,
    },
  });

  async function onSubmit(data: Step1Data) {
    await saveParticipantStep(userId, { ...data, completedStep: Math.max(stepNum, (existing?.completedStep as number ?? 0)) });
    onDone();
  }

  return (
    <SurveyStep
      title="Persönliche Angaben"
      description="Erzähl uns ein bisschen über dich."
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
      onBack={stepNum > 1 ? () => router.push(`/survey/${stepNum - 1}`) : undefined}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="anzeigename">Anzeigename</Label>
          <Input
            id="anzeigename"
            placeholder="z. B. Max M."
            {...form.register("anzeigename")}
          />
          <FieldError msg={form.formState.errors.anzeigename?.message} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Geschlecht</Label>
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Männlich</SelectItem>
                    <SelectItem value="f">Weiblich</SelectItem>
                    <SelectItem value="d">Divers</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError msg={form.formState.errors.gender?.message} />
          </div>

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
        </div>

        <div className="space-y-1.5">
          <Label>Ich suche / biete</Label>
          <Controller
            control={form.control}
            name="rolle"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suchend">Ich suche ein WG-Zimmer</SelectItem>
                  <SelectItem value="anbietend">Ich biete ein WG-Zimmer an</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError msg={form.formState.errors.rolle?.message} />
        </div>
      </div>
    </SurveyStep>
  );
}

function Step2Form({
  existing,
  userId,
  onDone,
  stepNum,
}: {
  existing: ParticipantDoc | null;
  userId: string;
  onDone: () => void;
  stepNum: number;
}) {
  const router = useRouter();
  const form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      budget_min: (existing?.budget_min as number) ?? undefined,
      budget_max: (existing?.budget_max as number) ?? undefined,
      location: (existing?.location as string) ?? "",
      einzug_fruehestens: (existing?.einzug_fruehestens as string) ?? "",
      einzug_spaetestens: (existing?.einzug_spaetestens as string) ?? "",
      raucher: (existing?.raucher as Step2Data["raucher"]) ?? undefined,
      raucher_toleranz: (existing?.raucher_toleranz as Step2Data["raucher_toleranz"]) ?? undefined,
      haustiere: (existing?.haustiere as Step2Data["haustiere"]) ?? undefined,
      haustiere_toleranz: (existing?.haustiere_toleranz as Step2Data["haustiere_toleranz"]) ?? undefined,
      nur_frauen_wg: (existing?.nur_frauen_wg as boolean) ?? false,
    },
  });

  async function onSubmit(data: Step2Data) {
    await saveParticipantStep(userId, { ...data, completedStep: Math.max(stepNum, (existing?.completedStep as number ?? 0)) });
    onDone();
  }

  return (
    <SurveyStep
      title="Wohnpräferenzen"
      description="Deine Anforderungen an die Wohnsituation."
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onBack={() => router.push(`/survey/${stepNum - 1}`)}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="location">Stadt / Ort</Label>
          <Input
            id="location"
            placeholder="z. B. Hamburg"
            {...form.register("location")}
          />
          <FieldError msg={form.formState.errors.location?.message} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget_min">Mindestbudget (€/Monat)</Label>
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
            <Label htmlFor="budget_max">Maximalbudget (€/Monat)</Label>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="einzug_fruehestens">Einzug frühestens</Label>
            <Input
              id="einzug_fruehestens"
              type="date"
              {...form.register("einzug_fruehestens")}
            />
            <FieldError msg={form.formState.errors.einzug_fruehestens?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="einzug_spaetestens">Einzug spätestens</Label>
            <Input
              id="einzug_spaetestens"
              type="date"
              {...form.register("einzug_spaetestens")}
            />
            <FieldError msg={form.formState.errors.einzug_spaetestens?.message} />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Ich rauche</Label>
            <Controller
              control={form.control}
              name="raucher"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nein">Nein</SelectItem>
                    <SelectItem value="ja">Ja</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError msg={form.formState.errors.raucher?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Rauchen in der WG tolerierbar</Label>
            <Controller
              control={form.control}
              name="raucher_toleranz"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nein">Nein</SelectItem>
                    <SelectItem value="ja">Ja</SelectItem>
                    <SelectItem value="egal">Egal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError msg={form.formState.errors.raucher_toleranz?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Ich habe Haustiere</Label>
            <Controller
              control={form.control}
              name="haustiere"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nein">Nein</SelectItem>
                    <SelectItem value="ja">Ja</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError msg={form.formState.errors.haustiere?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Haustiere in der WG tolerierbar</Label>
            <Controller
              control={form.control}
              name="haustiere_toleranz"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nein">Nein</SelectItem>
                    <SelectItem value="ja">Ja</SelectItem>
                    <SelectItem value="egal">Egal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError msg={form.formState.errors.haustiere_toleranz?.message} />
          </div>
        </div>

        <Controller
          control={form.control}
          name="nur_frauen_wg"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                id="nur_frauen_wg"
              />
              <Label htmlFor="nur_frauen_wg" className="cursor-pointer font-normal">
                Nur Frauen-WG (nur bei weiblichem Geschlecht relevant)
              </Label>
            </div>
          )}
        />
      </div>
    </SurveyStep>
  );
}

function LikertStepForm<T extends Record<string, number>>({
  schema,
  items,
  title,
  description,
  existing,
  userId,
  onDone,
  stepNum,
  sections,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  items?: { key: string; label: string }[];
  title: string;
  description?: string;
  existing: ParticipantDoc | null;
  userId: string;
  onDone: () => void;
  stepNum: number;
  sections?: { title: string; items: { key: string; label: string }[] }[];
}) {
  const router = useRouter();
  const allItems = items ?? sections?.flatMap((s) => s.items) ?? [];
  const defaults = Object.fromEntries(
    allItems.map((item) => [
      item.key,
      typeof existing?.[item.key] === "number"
        ? (existing[item.key] as number)
        : undefined,
    ])
  ) as DefaultValues<T>;

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  async function onSubmit(data: T) {
    await saveParticipantStep(userId, { ...data, completedStep: Math.max(stepNum, (existing?.completedStep as number ?? 0)) });
    onDone();
  }

  const renderItem = (key: string, label: string) => (
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
  );

  return (
    <SurveyStep
      title={title}
      description={description}
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onBack={() => router.push(`/survey/${stepNum - 1}`)}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
      isLastStep={stepNum === TOTAL_STEPS}
    >
      {sections
        ? sections.map((section, idx) => (
            <div key={section.title}>
              {idx > 0 && <Separator className="my-4" />}
              <Section title={section.title}>
                {section.items.map((item) => renderItem(item.key, item.label))}
              </Section>
            </div>
          ))
        : allItems.map((item) => renderItem(item.key, item.label))}
    </SurveyStep>
  );
}

// Step 7 needs a tagesrhythmus select + UCLA on top of Likert lifestyle items
function Step7Form({
  existing,
  userId,
  onDone,
  stepNum,
}: {
  existing: ParticipantDoc | null;
  userId: string;
  onDone: () => void;
  stepNum: number;
}) {
  const router = useRouter();
  const form = useForm<Step7Data>({
    resolver: zodResolver(step7Schema),
    defaultValues: {
      sauberkeit: (existing?.sauberkeit as number) ?? undefined,
      gemeinschaft: (existing?.gemeinschaft as number) ?? undefined,
      besucher: (existing?.besucher as number) ?? undefined,
      laerm_toleranz: (existing?.laerm_toleranz as number) ?? undefined,
      struktur: (existing?.struktur as number) ?? undefined,
      teilen: (existing?.teilen as number) ?? undefined,
      selbst_sauberkeit: (existing?.selbst_sauberkeit as number) ?? undefined,
      tagesrhythmus: (existing?.tagesrhythmus as Step7Data["tagesrhythmus"]) ?? undefined,
      ucla_1: (existing?.ucla_1 as number) ?? undefined,
      ucla_2: (existing?.ucla_2 as number) ?? undefined,
      ucla_3: (existing?.ucla_3 as number) ?? undefined,
      ucla_4: (existing?.ucla_4 as number) ?? undefined,
      ucla_5: (existing?.ucla_5 as number) ?? undefined,
      ucla_6: (existing?.ucla_6 as number) ?? undefined,
    },
  });

  async function onSubmit(data: Step7Data) {
    await saveParticipantStep(userId, { ...data, completedStep: TOTAL_STEPS });
    await markSurveyDone(userId);
    router.push("/results");
  }

  return (
    <SurveyStep
      title="Lifestyle & Alltagsgewohnheiten"
      description="Wie lebst du im Alltag?"
      step={stepNum}
      totalSteps={TOTAL_STEPS}
      onBack={() => router.push(`/survey/${stepNum - 1}`)}
      onNext={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
      isLastStep
    >
      <Section title="Wohnstil">
        {LIFESTYLE_ITEMS.map(({ key, label }) => (
          <Controller
            key={key}
            control={form.control}
            name={key}
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

      <Section title="Tagesrhythmus">
        <div className="space-y-1.5">
          <Label>Was beschreibt deinen typischen Tagesrhythmus?</Label>
          <Controller
            control={form.control}
            name="tagesrhythmus"
            render={({ field, fieldState }) => (
              <>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buero">Bürozeiten (ca. 9–17 Uhr)</SelectItem>
                    <SelectItem value="homeoffice">Hauptsächlich von zu Hause</SelectItem>
                    <SelectItem value="schicht">Schichtarbeit (wechselnde Zeiten)</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError msg={fieldState.error?.message} />
              </>
            )}
          />
        </div>
      </Section>

      <Separator className="my-4" />

      <Section title="Soziales Wohlbefinden (Forschungsfrage)">
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          1 = nie · 5 = immer — Diese Fragen dienen ausschließlich der Forschung und fließen nicht ins Matching ein.
        </p>
        {UCLA_ITEMS.map((label, i) => (
          <Controller
            key={`ucla_${i + 1}`}
            control={form.control}
            name={`ucla_${i + 1}` as keyof Step7Data}
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
      if (!user) {
        router.replace("/login");
        return;
      }
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

  const sharedProps = { existing, userId, onDone: goNext, stepNum };

  if (stepNum === 1) return <Step1Form {...sharedProps} />;
  if (stepNum === 2) return <Step2Form {...sharedProps} />;

  if (stepNum === 3)
    return (
      <LikertStepForm<Step3Data>
        {...sharedProps}
        schema={step3Schema}
        title="Stress & Belastung"
        description="Wie erleben Sie Stress in Ihrem Alltag? (PSS-5)"
        items={PSS_ITEMS.map((label, i) => ({ key: `pss_${i + 1}`, label }))}
      />
    );

  if (stepNum === 4)
    return (
      <LikertStepForm<Step4Data>
        {...sharedProps}
        schema={step4Schema}
        title="Resilienz"
        description="Wie gut erholst du dich von Rückschlägen? (RS-5)"
        items={RS_ITEMS.map((label, i) => ({ key: `rs_${i + 1}`, label }))}
      />
    );

  if (stepNum === 5)
    return (
      <LikertStepForm<Step5Data>
        {...sharedProps}
        schema={step5Schema}
        title="Werte & Zusammenleben"
        description="Deine Einstellungen zu Gemeinschaft und Gesellschaft."
        sections={[
          { title: "Ordnung & Autorität (KSA)", items: KSA_ITEMS.map((label, i) => ({ key: `ksa_${i + 1}`, label })) },
          { title: "Soziale Dominanz (KSDO)", items: KSDO_ITEMS.map((label, i) => ({ key: `ksdo_${i + 1}`, label })) },
        ]}
      />
    );

  if (stepNum === 6)
    return (
      <LikertStepForm<Step6Data>
        {...sharedProps}
        schema={step6Schema}
        title="Persönlichkeit & Verhalten"
        description="Wie reagierst du in sozialen Situationen?"
        sections={[
          { title: "Aggressivität", items: AGG_ITEMS.map((label, i) => ({ key: `agg_${i + 1}`, label })) },
          { title: "Impulsivität", items: IMP_ITEMS.map((label, i) => ({ key: `imp_${i + 1}`, label })) },
          { title: "Neurotizismus", items: NEU_ITEMS.map((label, i) => ({ key: `neu_${i + 1}`, label })) },
        ]}
      />
    );

  if (stepNum === 7)
    return <Step7Form existing={existing} userId={userId} onDone={() => {}} stepNum={7} />;

  return null;
}
