"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SurveyStepProps {
  title: string;
  description?: string;
  step: number;
  totalSteps?: number;
  onBack?: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
  isLastStep?: boolean;
  children: React.ReactNode;
}

export function SurveyStep({
  title,
  description,
  step,
  totalSteps = 7,
  onBack,
  onNext,
  isSubmitting = false,
  isLastStep = false,
  children,
}: SurveyStepProps) {
  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Schritt {step} von {totalSteps}
          </span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="space-y-1">{children}</div>

      <div className="mt-8 flex justify-between">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack} size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Zurück
          </Button>
        ) : (
          <div />
        )}
        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          size="sm"
        >
          {isSubmitting ? (
            "Wird gespeichert…"
          ) : isLastStep ? (
            "Fragebogen abschließen"
          ) : (
            <>
              Weiter
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
