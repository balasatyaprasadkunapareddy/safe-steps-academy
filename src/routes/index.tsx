import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardList,
  Medal,
  ShieldCheck,
  SignpostBig,
  BarChart3,
  ArrowRight,
} from "lucide-react";

import { Button, Card, Chip } from "@/components/ui-kit";
import { ThemeToggle } from "@/components/AppShell";
import heroImage from "@/assets/lesson-pedestrian.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeSteps — Smart Traffic Safety Learning for Schools" },
      {
        name: "description",
        content:
          "Interactive road safety lessons, Indian traffic sign library, quizzes, badges and awareness surveys for school students and teachers.",
      },
      { property: "og:title", content: "SafeSteps — Smart Traffic Safety Learning for Schools" },
      {
        property: "og:description",
        content:
          "Interactive road safety lessons, traffic signs, quizzes, badges and awareness analytics built for schools.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: BookOpen,
    title: "Guided lessons",
    body: "Pedestrian, bicycle, two-wheeler and school bus safety with practical tips.",
  },
  {
    icon: SignpostBig,
    title: "Sign library",
    body: "Searchable Indian traffic signs grouped as mandatory, warning and informational.",
  },
  {
    icon: ClipboardList,
    title: "Smart quizzes",
    body: "Instant feedback and clear explanations after every question.",
  },
  {
    icon: Medal,
    title: "Badges & XP",
    body: "Earn XP for every correct answer and unlock five achievement badges.",
  },
  {
    icon: BarChart3,
    title: "Survey analytics",
    body: "Teachers see awareness scores in live pie and bar charts.",
  },
  {
    icon: ShieldCheck,
    title: "Certificates",
    body: "Students download a completion certificate for their portfolio.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-4">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          SafeSteps
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link to="/auth">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
        <div className="animate-rise">
          <Chip tone="accent">Community service initiative</Chip>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
            Every safe journey starts with a <span className="text-primary">SafeStep</span>.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            A traffic safety learning platform built for school students — interactive lessons, the
            Indian traffic sign library, quizzes with instant feedback, badges, leaderboards and
            awareness analytics for teachers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg">
                Start learning <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" variant="tonal">
                Register your class
              </Button>
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              ["4", "Lesson modules"],
              ["16", "Traffic signs"],
              ["16", "Quiz questions"],
            ].map(([value, label]) => (
              <div key={label} className="surface p-4">
                <dt className="font-display text-2xl font-bold text-primary">{value}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border shadow-lift">
          <img
            src={heroImage}
            alt="School students crossing a road safely on a zebra crossing"
            width={1024}
            height={640}
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-2xl font-bold">What's inside</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-lift">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        SafeSteps · A student community service project on road safety awareness.
      </footer>
    </div>
  );
}
