import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { CalendarCheck, Wallet, Users, Bell, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sixxer — Cricket team management for clubs & players" },
      {
        name: "description",
        content:
          "Sixxer helps cricket clubs run fixtures, collect match fees, track availability, and keep every player in the loop.",
      },
      { property: "og:title", content: "Sixxer — Cricket team management" },
      {
        property: "og:description",
        content:
          "Fixtures, availability, payments and updates — built for cricket clubs and players.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/home" />;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground font-extrabold">
            S
          </span>
          <span className="text-lg font-bold tracking-tight">Sixxer</span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[640px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--primary), transparent)" }}
        />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-12 pt-10 text-center sm:pt-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Built for cricket clubs &amp; players
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Run your club. <span className="text-primary">Play more cricket.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Fixtures, availability, match fees, and team updates — all in one place. Sixxer
            saves admins hours every week and keeps every player in the loop.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
            >
              Create your club
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<CalendarCheck className="h-5 w-5" />}
            title="Fixtures &amp; events"
            body="Create matches and training in seconds. Players see what's next at a glance."
          />
          <FeatureCard
            icon={<Users className="h-5 w-5" />}
            title="Availability"
            body="One tap RSVPs. See who's in, who's out, and chase nudges with a tap."
          />
          <FeatureCard
            icon={<Wallet className="h-5 w-5" />}
            title="Match fees"
            body="Send payment requests, track who's paid, and stop chasing on WhatsApp."
          />
          <FeatureCard
            icon={<Bell className="h-5 w-5" />}
            title="Updates"
            body="Post announcements and keep the squad in the loop without group chat chaos."
          />
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Sixxer</span>
          <span>Made for cricket. Designed for every club.</span>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3
        className="text-base font-semibold text-card-foreground"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
