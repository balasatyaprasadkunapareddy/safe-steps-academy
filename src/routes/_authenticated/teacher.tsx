import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, School, Edit3, Check } from "lucide-react";
import { toast } from "sonner";

import { SurveyAnalytics, StudentTable } from "@/components/teacher/Analytics";
import { BadgeManager, LessonManager, QuestionManager } from "@/components/teacher/Managers";
import { Button, Card, EmptyState, Label, Select, Spinner } from "@/components/ui-kit";
import { useProfile, useSession } from "@/hooks/use-session";
import { ensureProfileAndRole } from "@/lib/profile";
import { CLASSES, LOCATIONS, SCHOOLS, formatSchoolWithLocation } from "@/lib/schools";

export const Route = createFileRoute("/_authenticated/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — SafeSteps" },
      {
        name: "description",
        content: "Manage lessons, quizzes, badges and view student progress and survey analytics.",
      },
      { property: "og:title", content: "Teacher Dashboard — SafeSteps" },
      {
        property: "og:description",
        content: "Road safety content management and classroom analytics.",
      },
    ],
  }),
  component: TeacherPage,
});

const TABS = ["Students", "Survey analytics", "Lessons", "Questions", "Badges"] as const;

function TeacherPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data: me, isLoading } = useProfile();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Students");

  const [editingBranch, setEditingBranch] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(LOCATIONS[0] as string);
  const [selectedSchool, setSelectedSchool] = useState(SCHOOLS[0] as string);
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [savingBranch, setSavingBranch] = useState(false);

  if (isLoading) return <Spinner label="Loading dashboard" />;
  if (!me?.isTeacher) {
    return <EmptyState title="Teachers only" hint="This area is restricted to teacher accounts." />;
  }

  const scopeLabel = [
    me.profile?.school,
    me.profile?.class_name && `Class ${me.profile.class_name}`,
  ]
    .filter(Boolean)
    .join(" · ");

  async function saveBranch() {
    const userId = session?.user?.id ?? me?.profile?.id;
    if (!userId) return;

    setSavingBranch(true);
    try {
      const fullSchool = formatSchoolWithLocation(selectedSchool, selectedLoc);
      const finalClass = selectedClass === "All Classes" ? "" : selectedClass;

      await ensureProfileAndRole(userId, {
        role: "teacher",
        full_name: me?.profile?.full_name ?? "Teacher",
        school: fullSchool,
        location: selectedLoc,
        class_name: finalClass,
      });

      queryClient.invalidateQueries();
      toast.success("School branch updated successfully");
      setEditingBranch(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update branch");
    } finally {
      setSavingBranch(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Teacher dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Manage content, track students and review survey insights.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {scopeLabel
            ? `Showing students for ${scopeLabel}`
            : "No school or class branch set yet."}
        </p>
        <button
          type="button"
          onClick={() => setEditingBranch(!editingBranch)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary hover:bg-muted transition-colors cursor-pointer"
        >
          <Edit3 className="size-3.5" />
          {scopeLabel ? "Change branch / school" : "Set your branch / school"}
        </button>
      </div>

      {editingBranch && (
        <Card className="mt-4 p-4 space-y-4 max-w-xl border-primary/40 bg-card">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <School className="size-4 text-primary" /> Select School Branch
            </h3>
            <button
              type="button"
              onClick={() => setEditingBranch(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Location / Branch</Label>
              <Select
                value={selectedLoc}
                onChange={(e) => setSelectedLoc(e.target.value)}
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>School</Label>
              <Select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
              >
                {SCHOOLS.map((sch) => (
                  <option key={sch} value={sch}>
                    {sch}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Class / Grade</Label>
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="All Classes">All Classes</option>
                {CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" onClick={saveBranch} disabled={savingBranch}>
              {savingBranch ? "Saving branch…" : "Save branch settings"}
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "primary" : "outline"}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Students" && <StudentTable />}
        {tab === "Survey analytics" && <SurveyAnalytics />}
        {tab === "Lessons" && <LessonManager />}
        {tab === "Questions" && <QuestionManager />}
        {tab === "Badges" && <BadgeManager />}
      </div>
    </div>
  );
}
