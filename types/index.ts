export type ScoreComponent = {
  label: string;
  value: number; // 0–100
};

export type MatchErgebnis = {
  participantId: string;
  anzeigename: string;
  age: number | null;
  location: string;
  rolle: "suchend" | "anbietend" | null;
  gesamtScore: number; // 0–100
  band: "sehr passend" | "gut passend" | "mäßig passend";
  komponenten: ScoreComponent[];
  zusammenfassung: string;
};

export type DatasetStats = {
  totalParticipants: number;
  surveyDoneCount: number;
};
