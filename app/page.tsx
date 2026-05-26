import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Wohnraum-Partnerschaften
        </h1>
        <p className="text-lg text-muted-foreground">
          Finde deinen passenden Mitbewohner — basierend auf Persönlichkeit,
          Lebensstil und gemeinsamen Werten.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
            Jetzt registrieren
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Anmelden
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Ein Forschungsprojekt der NORDAKADEMIE in Kooperation mit 20FLOW7 GmbH.
        </p>
      </div>
    </main>
  );
}
