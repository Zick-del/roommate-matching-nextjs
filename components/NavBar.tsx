"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { account, getCurrentUser } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render only after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-8 w-8" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Farbschema wechseln"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? (
        /* sun */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        /* moon */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      )}
    </Button>
  );
}

export function NavBar() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => setName(user?.name ?? user?.email ?? null));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await account.deleteSession("current");
    } finally {
      router.replace("/login");
    }
  }

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/results" className="text-sm font-semibold tracking-tight">
          Wohnraum&#8209;Partnerschaften
        </Link>
        <div className="flex items-center gap-1">
          {name && (
            <span className="hidden text-sm text-muted-foreground sm:block mr-2">
              {name}
            </span>
          )}
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "…" : "Abmelden"}
          </Button>
        </div>
      </div>
    </header>
  );
}
