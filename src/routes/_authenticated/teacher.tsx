import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { SurveyAnalytics, StudentTable } from "@/components/teacher/Analytics";
import { BadgeManager, LessonManager, QuestionManager } from "@/components/teacher/Managers";
import { Button, EmptyState, Spinner } from "@/components/ui-kit";
import { useProfile } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — SafeSteps" },
      { name: "description", content: "Manage lessons, quizzes, badges and view student progress and survey analytics." },
      { property: "og:title", content: "Teacher Dashboard — SafeSteps" },
      { property: "og:description", content: "Road safety content management and classroom analytics." },
    ],
  }),
  component: TeacherPage,
});

const TABS = ["Students", "Survey analytics", "Lessons", "Questions", "Badges"] as const;

function TeacherPage() {
  const { data: me, isLoading } = useProfile();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Students");

  if (isLoading) return <Spinner label="Loading dashboard" />;
  if (!me?.isTeacher) {
    return <EmptyState title="Teachers only" hint="This area is restricted to teacher accounts." />;
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Teacher dashboard</h1>
      <p className="mt-2 text-muted-foreground">Manage content, track students and review survey insights.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "primary" : "outline"} onClick={() => setTab(t)}>
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
