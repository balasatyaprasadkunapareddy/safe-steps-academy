import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, Chip, EmptyState, Progress, Spinner } from "@/components/ui-kit";
import { useProfile } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { surveyQuestions } from "@/lib/safesteps";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

type TeacherScope = {
  school: string;
  className: string;
  studentIds: string[];
  students: Array<{
    id: string;
    full_name: string;
    school: string | null;
    class_name: string | null;
    xp: number | null;
  }>;
};

async function getTeacherScope(
  profile: { school?: string | null; class_name?: string | null } | null | undefined,
  currentUserId?: string | null,
): Promise<TeacherScope> {
  const school = profile?.school?.trim() ?? "";
  const className = profile?.class_name?.trim() ?? "";


  let teacherIds = new Set<string>();
  try {
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id, role");
    if (!roleError) {
      teacherIds = new Set(
        (roleRows ?? []).filter((row) => row.role === "teacher").map((row) => row.user_id),
      );
    }
  } catch (roleError) {
    console.warn("[teacher-scope] Could not read teacher roles", roleError);
  }

  let query = supabase.from("profiles").select("id, full_name, school, class_name, xp");
  if (school) query = query.eq("school", school);
  if (className) query = query.eq("class_name", className);
  query = query.not("id", "eq", currentUserId ?? "");

  const { data: profilesData, error: profilesError } = await query.order("xp", {
    ascending: false,
  });
  if (profilesError) throw profilesError;

  const students = (profilesData ?? []).filter((profileRow) => {
    if (profileRow.id === currentUserId) return false;
    if (teacherIds.has(profileRow.id)) return false;
    if (school && (profileRow.school?.trim() ?? "") !== school) return false;
    if (className && (profileRow.class_name?.trim() ?? "") !== className) return false;
    return true;
  });

  return {
    school,
    className,
    studentIds: students.map((student) => student.id),
    students,
  };
}

export function SurveyAnalytics() {
  const { data: me } = useProfile();
  const { data, isLoading } = useQuery({
    queryKey: ["survey-analytics", me?.profile?.school ?? "", me?.profile?.class_name ?? ""],
    enabled: Boolean(me?.profile),
    queryFn: async () => {
      const scope = await getTeacherScope(me?.profile, me?.profile?.id);
      if (!scope.studentIds.length) return { responses: [], scope };

      const { data: responsesData, error } = await supabase
        .from("survey_responses")
        .select("user_id, answers, awareness_score")
        .in("user_id", scope.studentIds);
      if (error) throw error;
      return { responses: responsesData ?? [], scope };
    },
  });

  if (!me?.profile && !me?.isTeacher) return <Spinner label="Loading profile" />;
  if (!me?.isTeacher && !me?.profile?.school && !me?.profile?.class_name) {
    return (
      <EmptyState
        title="School and class not set"
        hint="Set your school and class in your profile so the dashboard can show the right students."
      />
    );
  }
  if (isLoading) return <Spinner label="Loading survey analytics" />;
  if (!data?.responses.length)
    return (
      <EmptyState
        title="No survey responses yet"
        hint="Ask students in your school/class to complete the survey."
      />
    );

  const responses = data.responses as Array<{
    user_id: string;
    answers: Record<string, number>;
    awareness_score: number;
  }>;
  const overall = Math.round(
    responses.reduce((sum, response) => sum + response.awareness_score, 0) / responses.length,
  );

  const helmet = surveyQuestions[0]!;
  const helmetCounts = helmet.options.map((option, i) => ({
    name: option,
    value: responses.filter((response) => response.answers[helmet.id] === i).length,
  }));

  const perQuestion = surveyQuestions.map((question) => {
    const aware = responses.filter(
      (response) => response.answers[question.id] === question.awareIndex,
    ).length;
    return {
      name: question.id,
      aware: Math.round((aware / responses.length) * 100),
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Total responses</p>
          <p className="font-display text-3xl font-bold text-primary">{responses.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Overall awareness score</p>
          <p className="font-display text-3xl font-bold text-primary">{overall}%</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Awareness level</p>
          <Chip
            tone={overall >= 70 ? "success" : overall >= 45 ? "accent" : "danger"}
            className="mt-2"
          >
            {overall >= 70 ? "Good" : overall >= 45 ? "Needs improvement" : "Critical"}
          </Chip>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-lg font-semibold">Helmet usage</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={helmetCounts} dataKey="value" nameKey="name" outerRadius={90} label>
                  {helmetCounts.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-semibold">Safe answers per question (%)</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perQuestion}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="aware" radius={[8, 8, 0, 0]} fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function StudentTable() {
  const { data: me } = useProfile();
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-students", me?.profile?.school ?? "", me?.profile?.class_name ?? ""],
    enabled: Boolean(me?.profile),
    queryFn: async () => {
      const scope = await getTeacherScope(me?.profile, me?.profile?.id);
      if (!scope.studentIds.length) return { students: [], totalAttempts: 0, avgAccuracy: 0, activeStudentsCount: 0 };

      const [badgesRes, attemptsRes] = await Promise.all([
        supabase.from("badges").select("*").order("min_xp"),
        supabase
          .from("quiz_attempts")
          .select("id, user_id, category, score, total, created_at")
          .in("user_id", scope.studentIds)
          .order("created_at", { ascending: false }),
      ]);
      if (badgesRes.error) throw badgesRes.error;
      if (attemptsRes.error) throw attemptsRes.error;

      const badges = badgesRes.data ?? [];
      const attempts = attemptsRes.data ?? [];

      type AttemptItem = { id: string; category: string; score: number; total: number; created_at: string };
      const byUser = new Map<string, { attemptsCount: number; score: number; total: number; history: AttemptItem[] }>();

      for (const attempt of attempts) {
        const entry = byUser.get(attempt.user_id) ?? { attemptsCount: 0, score: 0, total: 0, history: [] };
        entry.attemptsCount += 1;
        entry.score += attempt.score;
        entry.total += attempt.total;
        entry.history.push(attempt);
        byUser.set(attempt.user_id, entry);
      }

      let grandTotalScore = 0;
      let grandTotalPossible = 0;
      let activeStudentsCount = 0;

      const studentsWithStats = scope.students.map((student) => {
        const xp = student.xp ?? 0;
        const currentBadge = [...badges].reverse().find((badge) => badge.min_xp <= xp);
        const nextBadge = badges.find((badge) => badge.min_xp > xp);
        const startXp = currentBadge?.min_xp ?? 0;
        const range = Math.max(1, (nextBadge?.min_xp ?? startXp + 1) - startXp);
        const progress = Math.min(100, Math.max(0, ((xp - startXp) / range) * 100));

        const userStats = byUser.get(student.id);
        if (userStats && userStats.attemptsCount > 0) {
          activeStudentsCount += 1;
          grandTotalScore += userStats.score;
          grandTotalPossible += userStats.total;
        }

        return {
          ...student,
          stats: userStats,
          progress,
          nextBadge: nextBadge?.name ?? "All badges unlocked",
        };
      });

      const avgAccuracy = grandTotalPossible > 0 ? Math.round((grandTotalScore / grandTotalPossible) * 100) : 0;

      return {
        students: studentsWithStats,
        totalAttempts: attempts.length,
        avgAccuracy,
        activeStudentsCount,
      };
    },
  });

  if (!me?.profile && !me?.isTeacher) return <Spinner label="Loading profile" />;
  if (!me?.isTeacher && !me?.profile?.school && !me?.profile?.class_name) {
    return (
      <EmptyState
        title="School and class not set"
        hint="Set your school and class in your profile so the dashboard can show the right students."
      />
    );
  }
  if (isLoading) return <Spinner label="Loading students" />;
  if (!data?.students.length)
    return (
      <EmptyState
        title="No students found"
        hint="No students are registered for your school/class yet."
      />
    );

  const { students, totalAttempts, avgAccuracy, activeStudentsCount } = data;

  return (
    <div className="space-y-6">
      {/* Overview Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Students</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">{students.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Quiz Takers</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">{activeStudentsCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Quizzes Attempted</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">{totalAttempts}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Accuracy</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">{avgAccuracy}%</p>
        </Card>
      </div>

      {/* Student Table */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">Class</th>
              <th className="px-5 py-3">XP</th>
              <th className="px-5 py-3">Quizzes</th>
              <th className="px-5 py-3">Progress</th>
              <th className="px-5 py-3">Accuracy</th>
              <th className="px-5 py-3">Scores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student) => {
              const accuracy = student.stats?.total
                ? Math.round((student.stats.score / student.stats.total) * 100)
                : 0;
              const isExpanded = expandedStudentId === student.id;

              return (
                <Fragment key={student.id}>
                  <tr>
                    <td className="px-5 py-3 font-medium">
                      {student.full_name}
                      <span className="block text-xs text-muted-foreground">
                        {student.school || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{student.class_name || "—"}</td>
                    <td className="px-5 py-3 font-semibold text-primary">{student.xp ?? 0}</td>
                    <td className="px-5 py-3">{student.stats?.attemptsCount ?? 0}</td>
                    <td className="px-5 py-3 min-w-[160px]">
                      <div className="space-y-1">
                        <Progress value={student.progress ?? 0} />
                        <p className="text-xs text-muted-foreground">
                          {Math.round(student.progress ?? 0)}% to {student.nextBadge}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Chip tone={accuracy >= 60 ? "success" : accuracy > 0 ? "accent" : "muted"}>
                        {accuracy}%
                      </Chip>
                    </td>
                    <td className="px-5 py-3">
                      {student.stats?.history?.length ? (
                        <button
                          onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                          className="text-xs font-semibold text-primary underline hover:text-primary/80"
                        >
                          {isExpanded ? "Hide scores" : "View scores"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No attempts</span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Quiz Details */}
                  {isExpanded && student.stats?.history && (
                    <tr className="bg-muted/40">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Individual Quiz History ({student.full_name})
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {student.stats.history.map((attempt) => (
                              <div
                                key={attempt.id}
                                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs"
                              >
                                <div>
                                  <span className="font-semibold">{attempt.category}</span>
                                  <span className="block text-[10px] text-muted-foreground">
                                    {new Date(attempt.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <Chip tone={attempt.score / attempt.total >= 0.6 ? "success" : "danger"}>
                                  {attempt.score} / {attempt.total}
                                </Chip>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
