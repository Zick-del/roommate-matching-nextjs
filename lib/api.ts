import type { MatchErgebnis, DatasetStats } from "@/types";
import { MOCK_MATCHES } from "./mockData";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "Unbekannter Fehler");
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

// ── Raw shapes from FastAPI ───────────────────────────────────────────────────

type RawMatch = {
  partner_id: string;
  partner_display_name: string;
  score_band: string;
  total_score: number;
  components: Record<string, number | null>;
  explanation: { strengths: string[]; watch_outs: string[] };
};

type RawParticipant = {
  participant_id: string;
  age: number | null;
  role: string | null;
  location_lat: number | null;
  location_lon: number | null;
  [key: string]: unknown;
};

// ── Transformation helpers ────────────────────────────────────────────────────

const COMPONENT_LABELS: Record<string, string> = {
  personality:   "Persönlichkeit",
  motives:       "Motive",
  values:        "Werte",
  wellbeing:     "Wohlbefinden",
  expectation:   "Erwartungen",
  lifestyle:     "Lebensstil",
  complementary: "Tagesrhythmus",
};

const BAND_MAP: Record<string, MatchErgebnis["band"]> = {
  sehr_passend:    "sehr passend",
  gut_passend:     "gut passend",
  maessig_passend: "mäßig passend",
};

function coordsToCity(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return "";
  if (lat > 54.2) return "Kiel";
  if (lat > 53.85) return "Norderstedt";
  if (lat < 53.47) return "Hamburg-Harburg";
  if (lon < 9.95) return "Hamburg-Altona";
  if (lon > 10.15) return "Hamburg-Wandsbek";
  return "Hamburg";
}

function transformMatch(
  raw: RawMatch,
  profileMap: Map<string, RawParticipant>
): MatchErgebnis {
  const profile = profileMap.get(raw.partner_id);

  const komponenten = Object.entries(COMPONENT_LABELS)
    .filter(([key]) => raw.components[key] != null)
    .map(([key, label]) => ({
      label,
      value: Math.round(raw.components[key]! * 100),
    }));

  const zusammenfassung =
    raw.explanation.strengths[0] ??
    raw.explanation.watch_outs[0] ??
    "";

  return {
    participantId: raw.partner_id,
    anzeigename:   raw.partner_display_name,
    age:           profile?.age ?? null,
    location:      coordsToCity(profile?.location_lat ?? null, profile?.location_lon ?? null),
    rolle:         (profile?.role as "suchend" | "anbietend" | null) ?? null,
    gesamtScore:   Math.round(raw.total_score * 100),
    band:          BAND_MAP[raw.score_band] ?? "mäßig passend",
    komponenten,
    zusammenfassung,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getMatches(participantId: string): Promise<MatchErgebnis[]> {
  if (USE_MOCK) return MOCK_MATCHES;

  const [matchResp, participantsResp] = await Promise.all([
    apiFetch<{ matches: RawMatch[] }>(`/matches/${participantId}`),
    apiFetch<{ participants: RawParticipant[] }>("/participants"),
  ]);

  const profileMap = new Map(
    participantsResp.participants.map((p) => [p.participant_id, p])
  );

  return matchResp.matches.map((m) => transformMatch(m, profileMap));
}

export async function getStats(): Promise<DatasetStats> {
  return apiFetch("/stats");
}
