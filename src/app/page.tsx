import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, EyeOff, Building2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ------------------------------------------------------------------ */}
      {/* Nav                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="font-semibold tracking-tight">
            Trust<span className="text-primary">Line</span>
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure &amp; anonymous whistleblowing
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Trust<span className="text-primary">Line</span>
          </h1>

          <p className="text-xl font-medium tracking-tight text-foreground/80">
            Speak up. Stay safe.
          </p>

          <p className="text-lg text-muted-foreground">
            TrustLine gives organisations a secure, anonymous channel for
            employees to report concerns — without fear of retaliation.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/login">Manager sign in</Link>
            </Button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Feature cards                                                     */}
        {/* ---------------------------------------------------------------- */}
        <div className="mx-auto mt-20 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: EyeOff,
              title: "Anonymous by default",
              body: "Reporters choose whether to share contact details. Identities are never stored unless explicitly opted in.",
            },
            {
              icon: ShieldCheck,
              title: "End-to-end secure",
              body: "Magic link tokens keep reporting URLs unpredictable. Company data is fully segregated at the database level.",
            },
            {
              icon: Building2,
              title: "Per-company isolation",
              body: "Each organisation has its own reporting channel. Managers only see reports from their own company.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-lg border bg-card p-5 space-y-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} TrustLine. All rights reserved.
      </footer>
    </div>
  );
}
