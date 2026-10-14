import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, BookOpen, ClipboardList, Edit3, Flame, School, SignpostBig, Trophy, Download } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, Chip, Label, Progress, Select, Spinner } from "@/components/ui-kit";
import { useProfile, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfileAndRole } from "@/lib/profile";
import {
  CLASSES,
  LOCATIONS,
  SCHOOLS,
  SECTIONS,
  formatClassDisplay,
  formatClassWithSection,
  formatSchoolWithLocation,
  parseClassAndSection,
} from "@/lib/schools";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SafeSteps" },
      {
        name: "description",
        content: "Your road safety progress, XP, badges and quick links to lessons and quizzes.",
      },
      { property: "og:title", content: "Dashboard — SafeSteps" },
      {
        property: "og:description",
        content: "Track your XP, badges and quiz history on SafeSteps.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: me, isLoading } = useProfile();
  const userId = session?.user.id;

  const [editingBranch, setEditingBranch] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(LOCATIONS[0] as string);
  const [selectedSchool, setSelectedSchool] = useState(SCHOOLS[0] as string);

  const initialParsed = parseClassAndSection(me?.profile?.class_name);
  const [selectedClass, setSelectedClass] = useState(initialParsed.className);
  const [selectedSection, setSelectedSection] = useState(initialParsed.section);
  const [savingBranch, setSavingBranch] = useState(false);

  async function saveBranch() {
    if (!userId) return;
    setSavingBranch(true);
    try {
      const fullSchool = formatSchoolWithLocation(selectedSchool, selectedLoc);
      const fullClass = formatClassWithSection(selectedClass, selectedSection);
      await ensureProfileAndRole(userId, {
        role: "student",
        full_name: me?.profile?.full_name ?? "Student",
        school: fullSchool,
        location: selectedLoc,
        class_name: fullClass,
      });
      queryClient.invalidateQueries();
      toast.success("School branch updated successfully!");
      setEditingBranch(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update branch");
    } finally {
      setSavingBranch(false);
    }
  }

  const { data } = useQuery({
    queryKey: ["dashboard", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [attempts, badges, myBadges, lessons] = await Promise.all([
        supabase
          .from("quiz_attempts")
          .select("*")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("badges").select("*").order("min_xp"),
        supabase.from("user_badges").select("badge_id"),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
      ]);
      return {
        attempts: attempts.data ?? [],
        badges: badges.data ?? [],
        earned: new Set((myBadges.data ?? []).map((b) => b.badge_id)),
        lessonCount: lessons.count ?? 0,
      };
    },
  });

  if (isLoading || !data) return <Spinner label="Loading your dashboard" />;

  const xp = me?.profile?.xp ?? 0;
  const sortedBadges = [...data.badges].sort((a, b) => a.min_xp - b.min_xp);
  const nextBadge = sortedBadges.find((badge) => badge.min_xp > xp);
  const currentBadge = [...sortedBadges].reverse().find((badge) => badge.min_xp <= xp);
  const startXp = currentBadge?.min_xp ?? 0;
  const range = Math.max(1, (nextBadge?.min_xp ?? startXp + 1) - startXp);
  const progressToNext = nextBadge
    ? Math.min(100, Math.max(0, ((xp - startXp) / range) * 100))
    : 100;

  return (
    <div className="space-y-8 animate-fade-in page-transition">
      {/* Hero Section */}
      <section className="animate-rise gradient-hero rounded-3xl p-8 text-primary-foreground shadow-lift transition-all duration-300">
        <p className="text-sm opacity-85">Welcome back,</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
          {me?.profile?.full_name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm opacity-90">
          <p>
            {me?.profile?.school ? `${me.profile.school} · ` : ""}
            {me?.profile?.class_name
              ? formatClassDisplay(me.profile.class_name)
              : "Keep going — safety is a daily habit."}
          </p>
          <button
            type="button"
            onClick={() => setEditingBranch(!editingBranch)}
            className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold hover:bg-white/30 transition-colors cursor-pointer"
          >
            <Edit3 className="size-3" />
            {me?.profile?.school ? "Change branch / class" : "Set your school"}
          </button>
        </div>

        {editingBranch && (
          <div className="mt-4 rounded-2xl bg-black/25 p-4 backdrop-blur text-card-foreground shadow-lift animate-slide-up">
            <div className="flex items-center justify-between border-b border-white/20 pb-2 mb-3">
              <span className="text-sm font-semibold flex items-center gap-2 text-white">
                <School className="size-4" /> Select Your School, Branch & Section
              </span>
              <button
                type="button"
                onClick={() => setEditingBranch(false)}
                className="text-xs text-white/70 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-white">Location / Branch</Label>
                <Select
                  value={selectedLoc}
                  onChange={(e) => setSelectedLoc(e.target.value)}
                  className="bg-background text-foreground"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label className="text-white">School</Label>
                <Select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="bg-background text-foreground"
                >
                  {SCHOOLS.map((sch) => (
                    <option key={sch} value={sch}>
                      {sch}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label className="text-white">Class</Label>
                <Select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-background text-foreground"
                >
                  {CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label className="text-white">Section</Label>
                <Select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="bg-background text-foreground"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" onClick={saveBranch} disabled={savingBranch}>
                {savingBranch ? "Saving…" : "Save branch"}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3 animate-cascade">
          <div className="rounded-2xl bg-background/15 p-4 backdrop-blur transition-transform active:scale-95">
            <p className="text-xs uppercase tracking-wide opacity-80">Total XP</p>
            <p className="font-display text-3xl font-bold">{xp}</p>
          </div>
          <div className="rounded-2xl bg-background/15 p-4 backdrop-blur transition-transform active:scale-95">
            <p className="text-xs uppercase tracking-wide opacity-80">Current badge</p>
            <p className="font-display text-xl font-bold">
              {currentBadge?.name ?? "Not yet earned"}
            </p>
          </div>
          <div className="rounded-2xl bg-background/15 p-4 backdrop-blur transition-transform active:scale-95">
            <p className="text-xs uppercase tracking-wide opacity-80">Quizzes taken</p>
            <p className="font-display text-3xl font-bold">{data.attempts.length}</p>
          </div>
        </div>
      </section>

      {/* Progress Card */}
      <Card className="transition-transform active:scale-[0.99]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Progress to next badge</h2>
          <Chip tone="primary">
            <Flame className="size-3.5 animate-pulse" />{" "}
            {nextBadge ? `${nextBadge.min_xp - xp} XP to ${nextBadge.name}` : "All badges unlocked"}
          </Chip>
        </div>
        <Progress value={progressToNext} className="mt-4" />
      </Card>

      {/* Quick Access Navigation Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-cascade">
        {[
          {
            to: "/lessons",
            icon: BookOpen,
            title: "Lessons",
            body: `${data.lessonCount} safety modules`,
          },
          {
            to: "/signs",
            icon: SignpostBig,
            title: "Traffic signs",
            body: "Search the sign library",
          },
          {
            to: "/quiz",
            icon: ClipboardList,
            title: "Take a quiz",
            body: "Earn 10 XP per correct answer",
          },
          { to: "/leaderboard", icon: Trophy, title: "Leaderboard", body: "See where you rank" },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="block group">
            <Card className="h-full interactive-card hover-lift transition-all duration-200 group-active:scale-95">
              <item.icon className="size-6 text-primary transition-transform duration-200 group-hover:scale-110" />
              <p className="mt-4 font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Badges and Quiz History */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold">Your badges</h2>
          <div className="mt-4 space-y-3">
            {data.badges.map((badge, i) => {
              const earned = data.earned.has(badge.id);
              return (
                <div
                  key={badge.id}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className={`animate-cascade flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200 active:scale-98 ${earned
                      ? "border-primary/40 bg-primary-soft hover-lift"
                      : "border-border opacity-60"
                    }`}
                >
                  <Award
                    className={`size-6 ${earned ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{badge.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                  <span className="ml-auto text-xs font-semibold text-muted-foreground">
                    {badge.min_xp} XP
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">Recent quiz attempts</h2>
          {data.attempts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No attempts yet — take your first quiz!
            </p>
          ) : (
            <ul className="mt-4 space-y-3 animate-cascade">
              {data.attempts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm transition-transform active:scale-98"
                >
                  <span className="font-medium">{a.category}</span>
                  <span className="text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                  <Chip tone={a.score / a.total >= 0.6 ? "success" : "danger"}>
                    {a.score}/{a.total}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
          <Link to="/certificate" className="mt-5 block">
            <Button variant="outline" className="w-full active:scale-95 transition-transform">
              <Download className="size-4" /> Completion certificate
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}