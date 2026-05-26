"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScoreBar } from "./ScoreBar";
import type { MatchErgebnis } from "@/types";

const BAND_VARIANT: Record<MatchErgebnis["band"], "default" | "secondary" | "outline"> = {
  "sehr passend": "default",
  "gut passend": "secondary",
  "mäßig passend": "outline",
};

export function MatchCard({
  match,
  index,
}: {
  match: MatchErgebnis;
  index: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">#{index + 1}</span>
              <h3 className="text-lg font-semibold">{match.anzeigename}</h3>
              {match.rolle && (
                <Badge variant="outline" className="text-xs capitalize">
                  {match.rolle}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {match.age !== null ? `${match.age} Jahre` : ""}
              {match.age !== null && match.location ? " · " : ""}
              {match.location}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={BAND_VARIANT[match.band]}>{match.band}</Badge>
            <span className="text-2xl font-bold">{match.gesamtScore}%</span>
          </div>
        </div>
        <p className="mt-1 text-sm italic text-muted-foreground">
          {match.zusammenfassung}
        </p>
      </CardHeader>
      <CardContent>
        <Accordion multiple={false}>
          <AccordionItem value="score" className="border-none">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              Score-Aufschlüsselung
            </AccordionTrigger>
            <AccordionContent>
              <ScoreBar components={match.komponenten} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
