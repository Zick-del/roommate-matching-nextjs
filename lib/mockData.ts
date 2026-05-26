import type { MatchErgebnis } from "@/types";

export const MOCK_MATCHES: MatchErgebnis[] = [
  {
    participantId: "mock-001",
    anzeigename: "Lea",
    age: 24,
    location: "Hamburg-Eimsbüttel",
    rolle: "suchend",
    gesamtScore: 91,
    band: "sehr passend",
    zusammenfassung:
      "Sehr ähnliches Stressbewältigungs­profil und deckungsgleiche Wohnvorstellungen.",
    komponenten: [
      { label: "Persönlichkeit", value: 94 },
      { label: "Lifestyle", value: 88 },
      { label: "Werte", value: 95 },
      { label: "Komplementarität", value: 87 },
      { label: "Erwartungen", value: 91 },
    ],
  },
  {
    participantId: "mock-002",
    anzeigename: "Jonas",
    age: 26,
    location: "Hamburg-Altona",
    rolle: "anbietend",
    gesamtScore: 85,
    band: "sehr passend",
    zusammenfassung:
      "Hohe Resilienz­übereinstimmung und gleiches Budget­niveau machen eine gute Basis.",
    komponenten: [
      { label: "Persönlichkeit", value: 82 },
      { label: "Lifestyle", value: 90 },
      { label: "Werte", value: 83 },
      { label: "Komplementarität", value: 88 },
      { label: "Erwartungen", value: 82 },
    ],
  },
  {
    participantId: "mock-003",
    anzeigename: "Mia",
    age: 23,
    location: "Kiel-Innenstadt",
    rolle: "suchend",
    gesamtScore: 78,
    band: "gut passend",
    zusammenfassung:
      "Ähnliche Alltagsgewohnheiten; leichte Unterschiede beim Umgang mit Konflikten.",
    komponenten: [
      { label: "Persönlichkeit", value: 75 },
      { label: "Lifestyle", value: 84 },
      { label: "Werte", value: 79 },
      { label: "Komplementarität", value: 71 },
      { label: "Erwartungen", value: 80 },
    ],
  },
  {
    participantId: "mock-004",
    anzeigename: "Felix",
    age: 27,
    location: "Hamburg-Barmbek",
    rolle: "anbietend",
    gesamtScore: 74,
    band: "gut passend",
    zusammenfassung:
      "Geteilte Freizeitinteressen und Sauberkeits­vorstellungen; Budget leicht abweichend.",
    komponenten: [
      { label: "Persönlichkeit", value: 70 },
      { label: "Lifestyle", value: 78 },
      { label: "Werte", value: 76 },
      { label: "Komplementarität", value: 73 },
      { label: "Erwartungen", value: 74 },
    ],
  },
  {
    participantId: "mock-005",
    anzeigename: "Sara",
    age: 22,
    location: "Hamburg-Wandsbek",
    rolle: "suchend",
    gesamtScore: 68,
    band: "gut passend",
    zusammenfassung:
      "Komplementäre Persönlichkeits­anteile; unterschiedliche Schlafzeiten könnten Absprache erfordern.",
    komponenten: [
      { label: "Persönlichkeit", value: 65 },
      { label: "Lifestyle", value: 62 },
      { label: "Werte", value: 74 },
      { label: "Komplementarität", value: 80 },
      { label: "Erwartungen", value: 58 },
    ],
  },
  {
    participantId: "mock-006",
    anzeigename: "Tobias",
    age: 25,
    location: "Norderstedt",
    rolle: "anbietend",
    gesamtScore: 54,
    band: "mäßig passend",
    zusammenfassung:
      "Grundlegende Wohnvorstellungen stimmen überein; Lifestyle-Unterschiede sollten besprochen werden.",
    komponenten: [
      { label: "Persönlichkeit", value: 50 },
      { label: "Lifestyle", value: 48 },
      { label: "Werte", value: 61 },
      { label: "Komplementarität", value: 57 },
      { label: "Erwartungen", value: 53 },
    ],
  },
];
