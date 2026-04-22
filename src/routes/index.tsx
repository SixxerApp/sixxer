import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { CalendarCheck, MapPin, Timer, Wallet, Users, Bell, ArrowRight } from "lucide-react";
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
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
            S
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Sixxer
            </p>
            <p className="text-sm font-semibold text-foreground">Athletic team ops</p>
          </div>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden px-4 pb-16 pt-6 sm:px-6 sm:pb-20">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-64 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgb(84 217 217 / 0.18), transparent 55%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <div className="relative rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(27,33,33,0.96),rgba(15,20,21,0.98))] p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Reliable teammate
            </div>
            <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-none text-foreground sm:text-6xl">
              Club decisions in seconds.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Fixtures, availability, payments, and updates in one dark, field-ready workspace.
              Built for coaches, players, and parents who need clarity fast.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:max-w-md">
              <Link
                to="/signup"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Create your club
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-border bg-transparent px-6 py-4 text-base font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-accent/35"
              >
                I already have an account
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatChip label="Night-ready UI" value="Low glare" />
              <StatChip label="Fast actions" value="Thumb-first" />
              <StatChip label="Team clarity" value="One feed" />
            </div>
          </div>

          <div className="relative space-y-4">
            <div className="rounded-[1.75rem] border border-border bg-[color:var(--surface-container-low)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Tonight at a glance
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-foreground">Mavericks XI</h2>
                </div>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  14 confirmed
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <EventPreview
                  month="APR"
                  day="25"
                  title="League Match vs Kingsgrove"
                  meta="7:00 PM arrival"
                  location="North Creek Oval"
                />
                <EventPreview
                  month="APR"
                  day="27"
                  title="Training Block"
                  meta="6:15 PM start"
                  location="Indoor nets"
                />
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-[color:var(--surface-container)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                What moves faster
              </p>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <FeatureLine
                  icon={<CalendarCheck className="h-5 w-5" />}
                  title="Fixtures and RSVP status"
                  body="See the next event and who is in without digging through chat."
                />
                <FeatureLine
                  icon={<Wallet className="h-5 w-5" />}
                  title="Match fees and reminders"
                  body="Track who has paid and stop doing manual follow-ups."
                />
                <FeatureLine
                  icon={<Bell className="h-5 w-5" />}
                  title="Updates that stay visible"
                  body="Post announcements once and keep the whole squad aligned."
                />
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Core workflows
            </p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">Built for fast team ops</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            icon={<CalendarCheck className="h-5 w-5" />}
            title="Fixtures & events"
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Sixxer</span>
          <span>Made for cricket. Designed for every club.</span>
        </div>
      </footer>
    </main>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-[color:var(--surface-container-low)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function EventPreview({
  month,
  day,
  title,
  meta,
  location,
}: {
  month: string;
  day: string;
  title: string;
  meta: string;
  location: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/55 p-3">
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{month}</span>
        <span className="text-2xl font-extrabold leading-none">{day}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Timer className="h-3.5 w-3.5 text-primary" />
          <span>{meta}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>{location}</span>
        </div>
      </div>
    </div>
  );
}

function FeatureLine({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 leading-6 text-muted-foreground">{body}</p>
      </div>
    </li>
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
    <div className="rounded-[1.5rem] border border-border bg-[color:var(--surface-container-low)] p-5">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
