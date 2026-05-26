"use client";

interface LikertScaleProps {
  question: string;
  value: number | undefined;
  onChange: (val: number) => void;
  max?: 5 | 7;
  error?: string;
}

export function LikertScale({
  question,
  value,
  onChange,
  max = 5,
  error,
}: LikertScaleProps) {
  return (
    <div className="space-y-3 py-2">
      <p className="text-sm leading-relaxed">{question}</p>
      <div className="flex gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1 = stimme gar nicht zu</span>
        <span>{max} = stimme voll zu</span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
