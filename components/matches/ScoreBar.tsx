import { Progress } from "@/components/ui/progress";
import type { ScoreComponent } from "@/types";

export function ScoreBar({ components }: { components: ScoreComponent[] }) {
  return (
    <div className="space-y-3">
      {components.map((c) => (
        <div key={c.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{c.label}</span>
            <span className="font-medium">{c.value}%</span>
          </div>
          <Progress value={c.value} className="h-2" />
        </div>
      ))}
    </div>
  );
}
