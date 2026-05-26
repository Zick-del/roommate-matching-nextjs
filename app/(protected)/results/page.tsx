"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getCurrentUser, getParticipantByUserId } from "@/lib/appwrite";
import { getMatches, ApiError } from "@/lib/api";
import { MatchCard } from "@/components/matches/MatchCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { MatchErgebnis } from "@/types";

type RolleFilter = "alle" | "suchend" | "anbietend";

export default function ResultsPage() {
  const router = useRouter();
  const [participantDocId, setParticipantDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolleFilter, setRolleFilter] = useState<RolleFilter>("alle");

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const doc = await getParticipantByUserId(user.$id);
      if (!doc?.surveyDone) {
        router.replace("/survey/1");
        return;
      }
      setParticipantDocId(doc.$id);
      setLoading(false);
    })();
  }, [router]);

  const {
    data: matches,
    isLoading: matchesLoading,
    error,
  } = useQuery({
    queryKey: ["matches", participantDocId],
    queryFn: () => getMatches(participantDocId!),
    enabled: !!participantDocId,
    retry: false,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deine Matches</h1>
          <p className="mt-1 text-muted-foreground">
            Deine passendsten Mitbewohner-Kandidaten.
          </p>
        </div>
        <Link
          href="/survey/1"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Antworten bearbeiten
        </Link>
      </div>

      {matchesLoading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof ApiError && error.status === 404
            ? "Noch keine Matches verfügbar. Stelle sicher, dass der Matching-Server läuft."
            : "Fehler beim Laden der Matches. Bitte versuche es später erneut."}
        </div>
      )}

      {matches && matches.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          Noch keine Matches gefunden.
        </p>
      )}

      {matches && matches.length > 0 && (
        <>
          <div className="mb-4 flex gap-2">
            {(["alle", "suchend", "anbietend"] as RolleFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setRolleFilter(r)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  rolleFilter === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {r === "alle" ? `Alle (${matches.length})` : `${r} (${matches.filter((m: MatchErgebnis) => m.rolle === r).length})`}
              </button>
            ))}
          </div>

          {(() => {
            const filtered = rolleFilter === "alle"
              ? matches
              : matches.filter((m: MatchErgebnis) => m.rolle === rolleFilter);
            return filtered.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Keine {rolleFilter === "suchend" ? "Suchenden" : "Anbietenden"} gefunden.
              </p>
            ) : (
              <div className="space-y-4">
                {filtered.map((match: MatchErgebnis, i: number) => (
                  <MatchCard key={match.participantId} match={match} index={i} />
                ))}
              </div>
            );
          })()}
        </>
      )}

      <div className="mt-10 rounded-lg border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Hinweis:</strong> Dies ist eine Empfehlung, keine
          Verpflichtung — treffen Sie sich persönlich, bevor Sie eine
          Entscheidung treffen.
        </p>
      </div>
    </main>
  );
}
