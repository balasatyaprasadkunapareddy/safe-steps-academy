import { Fragment, useState, useMemo } from "react";
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
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  GraduationCap,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react";

import { Card, Chip, EmptyState, Progress, Spinner } from "@/components/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { surveyQuestions } from "@/lib/safesteps";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const normalizeClass = (c?: string | null) =>
  (c ?? "").trim().toLowerCase().replace(/^class\s+/i, "");

export type TeacherScope = {
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

export async function getTeacherScope(
  profile: { school?: string | null; class_name?: string | null } | null | undefined,
  currentUserId?: string | null,
): Promise<TeacherScope> {
  const school = profile?.school?.trim() ?? "";
  const className = profile?.class_name?.trim() ?? "";

  let teacherIds = new Set<string>();
  let studentIds = new Set<string>();
  try {
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id, role");
    if (!roleError && roleRows) {
      teacherIds = new Set(
        roleRows.filter((row) => row.role === "teacher").map((row) => row.user_id),
      );
      studentIds = new Set(
        roleRows.filter((row) => row.role === "student").map((row) => row.user_id),
      );
    }
  } catch (roleError) {
    console.warn("[teacher-scope] Could not read user roles", roleError);
  }

  let query = supabase.from("profiles").select("id, full_name, school, class_name, xp");
  if (currentUserId) {
    query = query.not("id", "eq", currentUserId);
  }

  const { data: profilesData, error: profilesError } = await query.order("xp", {
    ascending: false,
  });
  if (profilesError) throw profilesError;

  const students = (profilesData ?? []).filter((profileRow) => {
    // 1. Exclude the current teacher
    if (currentUserId && profileRow.id === currentUserId) return false;
    // 2. Exclude ANY other teacher account
    if (teacherIds.has(profileRow.id)) return false;
    // 3. Must be verified as a student if roles exist
    if (studentIds.size > 0 && !studentIds.has(profileRow.id)) return false;

    const matchSchool = (a?: string | null, b?: string | null) => {
      if (!a || !b) return false;
      const cleanA = a.trim().toLowerCase();
      const cleanB = b.trim().toLowerCase();
      if (cleanA === cleanB) return true;
      const baseA = cleanA.split(/\s*-\s*/)[0]?.trim();
      const baseB = cleanB.split(/\s*-\s*/)[0]?.trim();
      return cleanA === cleanB || (baseA && baseB && baseA === baseB);
    };

    // 4. Match school (exact branch or base school) if configured
    if (school && !matchSchool(profileRow.school, school)) {
      return false;
    }
    // 5. Match class (normalized) if configured
    if (className && (normalizeClass(profileRow.class_name) !== normalizeClass(className))) {
      return false;
    }
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
  const { session } = useSession();
  const { data: me } = useProfile();

  const currentSchool = me?.profile?.school?.trim() ?? "";
  const currentClass = me?.profile?.class_name?.trim() ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["survey-analytics-all", session?.user.id, currentSchool, currentClass],
    enabled: Boolean(session?.user.id),
    queryFn: async () => {
      const [surveyRes, profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("survey_responses")
          .select("id, user_id, answers, awareness_score, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, school, class_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (surveyRes.error) throw surveyRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const teacherIds = new Set(
        (rolesRes.data ?? []).filter((r) => r.role === "teacher").map((r) => r.user_id),
      );

      const profileMap = new Map<string, { full_name: string; school: string | null; class_name: string | null }>();
      for (const p of profilesRes.data ?? []) {
        profileMap.set(p.id, p);
      }

      // Filter out responses from teacher accounts
      const allStudentResponses = (surveyRes.data ?? [])
        .filter((r) => !teacherIds.has(r.user_id) && r.user_id !== session?.user.id)
        .map((r) => {
          const profile = profileMap.get(r.user_id);
          return {
            ...r,
            answers: r.answers as Record<string, number>,
            studentName: profile?.full_name ?? "Student",
            school: profile?.school?.trim() ?? "",
            className: profile?.class_name?.trim() ?? "",
          };
        });

      return allStudentResponses;
    },
  });

  if (isLoading) return <Spinner label="Loading survey analytics" />;

  const allResponses = data ?? [];

  if (!allResponses.length) {
    return (
      <EmptyState
        title="No survey responses yet"
        hint="Ask students to complete the road safety survey to view insights here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Traffic Safety Awareness Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregated insights from student survey submissions on road safety habits.
        </p>
      </div>

      <SurveyAnalyticsView
        responses={allResponses}
        currentSchool={currentSchool}
        currentClass={currentClass}
      />
    </div>
  );
}

function SurveyAnalyticsView({
  responses,
  currentSchool,
  currentClass,
}: {
  responses: Array<{
    id: string;
    user_id: string;
    answers: Record<string, number>;
    awareness_score: number;
    created_at: string;
    studentName: string;
    school: string;
    className: string;
  }>;
  currentSchool: string;
  currentClass: string;
}) {
  const schoolResponses = useMemo(() => {
    if (!currentSchool) return responses;
    const cleanCurrent = currentSchool.trim().toLowerCase();
    const baseCurrent = cleanCurrent.split(/\s*-\s*/)[0]?.trim();
    return responses.filter((r) => {
      const cleanR = r.school.trim().toLowerCase();
      if (!cleanR) return false;
      if (cleanR === cleanCurrent) return true;
      const baseR = cleanR.split(/\s*-\s*/)[0]?.trim();
      return cleanR === cleanCurrent || (baseR && baseCurrent && baseR === baseCurrent);
    });
  }, [responses, currentSchool]);

  const classResponses = useMemo(() => {
    if (!currentClass) return schoolResponses;
    return schoolResponses.filter(
      (r) => normalizeClass(r.className) === normalizeClass(currentClass),
    );
  }, [schoolResponses, currentClass]);

  const hasClassOption = Boolean(currentClass);
  const hasSchoolOption = Boolean(currentSchool);

  // Determine starting active tab
  const defaultTab = classResponses.length > 0 && hasClassOption
    ? "class"
    : schoolResponses.length > 0 && hasSchoolOption
      ? "school"
      : "all";

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          {hasClassOption && (
            <TabsTrigger value="class">
              My Class ({currentClass}) [{classResponses.length}]
            </TabsTrigger>
          )}
          {hasSchoolOption && (
            <TabsTrigger value="school">
              My School ({currentSchool}) [{schoolResponses.length}]
            </TabsTrigger>
          )}
          <TabsTrigger value="all">
            All Schools ({responses.length})
          </TabsTrigger>
        </TabsList>
      </div>

      {hasClassOption && (
        <TabsContent value="class">
          <SurveyDashboardContent
            responses={classResponses}
            scopeTitle={`Class ${currentClass} (${currentSchool || "Current School"})`}
          />
        </TabsContent>
      )}

      {hasSchoolOption && (
        <TabsContent value="school">
          <SurveyDashboardContent
            responses={schoolResponses}
            scopeTitle={currentSchool}
          />
        </TabsContent>
      )}

      <TabsContent value="all">
        <SurveyDashboardContent
          responses={responses}
          scopeTitle="All Registered Schools"
        />
      </TabsContent>
    </Tabs>
  );
}

function SurveyDashboardContent({
  responses,
  scopeTitle,
}: {
  responses: Array<{
    id: string;
    user_id: string;
    answers: Record<string, number>;
    awareness_score: number;
    created_at: string;
    studentName: string;
  }>;
  scopeTitle: string;
}) {
  if (!responses.length) {
    return (
      <EmptyState
        title={`No responses recorded for ${scopeTitle}`}
        hint="No students in this section have completed the survey yet. Try viewing the school-wide or all schools tab."
      />
    );
  }

  const overall = Math.round(
    responses.reduce((sum, r) => sum + r.awareness_score, 0) / responses.length,
  );

  const helmetQuestion = surveyQuestions[0]!;
  const helmetCounts = helmetQuestion.options.map((option, i) => ({
    name: option,
    value: responses.filter((r) => r.answers[helmetQuestion.id] === i).length,
  }));

  const perQuestion = surveyQuestions.map((q) => {
    const aware = responses.filter((r) => r.answers[q.id] === q.awareIndex).length;
    return {
      id: q.id,
      name: q.id.toUpperCase(),
      title: q.question,
      awareCount: aware,
      awarePercent: Math.round((aware / responses.length) * 100),
    };
  });

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Responses
            </p>
            <Users className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-primary">{responses.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">From {scopeTitle}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Average Awareness
            </p>
            <Percent className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-primary">{overall}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Based on safest road practices</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Safety Standing
            </p>
            <CheckCircle2 className="size-4 text-primary" />
          </div>
          <div className="mt-2">
            <Chip tone={overall >= 70 ? "success" : overall >= 45 ? "accent" : "danger"}>
              {overall >= 70 ? "Good Awareness" : overall >= 45 ? "Needs Improvement" : "Critical Attention Needed"}
            </Chip>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {overall >= 70 ? "Strong foundational safety knowledge" : "Targeted road safety training recommended"}
          </p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-lg font-semibold">Helmet Usage Habits</h3>
          <p className="text-xs text-muted-foreground">Two-wheeler helmet compliance breakdown</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={helmetCounts} dataKey="value" nameKey="name" outerRadius={85} label>
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
          <h3 className="font-display text-lg font-semibold">Safe Practices by Category (%)</h3>
          <p className="text-xs text-muted-foreground">Percentage answering the safest practice per topic</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perQuestion}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="awarePercent" name="Awareness %" radius={[6, 6, 0, 0]} fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Question-by-Question Detailed Breakdown */}
      <Card className="overflow-x-auto p-0">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold">Survey Topic Breakdown</h3>
          <p className="text-xs text-muted-foreground">Detailed safe response rates for each safety topic</p>
        </div>
        <table className="w-full min-w-[600px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Topic / Question</th>
              <th className="px-5 py-3">Safest Practice</th>
              <th className="px-5 py-3">Safe Answers</th>
              <th className="px-5 py-3">Awareness</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {perQuestion.map((item, idx) => {
              const q = surveyQuestions.find((sq) => sq.id === item.id);
              const bestAnswer = q ? q.options[q.awareIndex] : "—";
              return (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{item.title}</p>
                    <span className="text-xs text-muted-foreground">Category: {item.name}</span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{bestAnswer}</td>
                  <td className="px-5 py-3 font-semibold">
                    {item.awareCount} / {responses.length}
                  </td>
                  <td className="px-5 py-3 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <Progress value={item.awarePercent} className="flex-1" />
                      <span className="text-xs font-semibold">{item.awarePercent}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function StudentTable() {
  const { session } = useSession();
  const { data: me } = useProfile();
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const currentSchool = me?.profile?.school?.trim() ?? "";
  const currentClass = me?.profile?.class_name?.trim() ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-students-analytics", currentSchool, currentClass, session?.user.id],
    enabled: Boolean(session?.user.id),
    queryFn: async () => {
      const scope = await getTeacherScope(me?.profile, session?.user.id);
      if (!scope.studentIds.length) {
        return {
          students: [],
          totalAttempts: 0,
          completedQuizzes: 0,
          avgAccuracy: 0,
          activeStudentsCount: 0,
        };
      }

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

      type AttemptItem = {
        id: string;
        category: string;
        score: number;
        total: number;
        created_at: string;
      };

      const byUser = new Map<
        string,
        {
          attemptsCount: number;
          completedCount: number;
          score: number;
          total: number;
          history: AttemptItem[];
        }
      >();

      for (const attempt of attempts) {
        const entry = byUser.get(attempt.user_id) ?? {
          attemptsCount: 0,
          completedCount: 0,
          score: 0,
          total: 0,
          history: [],
        };
        entry.attemptsCount += 1;
        if (attempt.total > 0) {
          entry.completedCount += 1;
        }
        entry.score += attempt.score;
        entry.total += attempt.total;
        entry.history.push(attempt);
        byUser.set(attempt.user_id, entry);
      }

      let grandTotalScore = 0;
      let grandTotalPossible = 0;
      let activeStudentsCount = 0;
      let completedQuizzesCount = 0;

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
          completedQuizzesCount += userStats.completedCount;
          grandTotalScore += userStats.score;
          grandTotalPossible += userStats.total;
        }

        return {
          ...student,
          stats: userStats,
          progress,
          currentBadgeName: currentBadge?.name ?? "No badge",
          nextBadgeName: nextBadge ? `${nextBadge.name} (${nextBadge.min_xp} XP)` : "Max level achieved",
        };
      });

      const avgAccuracy =
        grandTotalPossible > 0 ? Math.round((grandTotalScore / grandTotalPossible) * 100) : 0;

      return {
        students: studentsWithStats,
        totalAttempts: attempts.length,
        completedQuizzes: completedQuizzesCount,
        avgAccuracy,
        activeStudentsCount,
      };
    },
  });

  if (isLoading) return <Spinner label="Loading student performance analytics" />;

  const {
    students = [],
    totalAttempts = 0,
    completedQuizzes = 0,
    avgAccuracy = 0,
    activeStudentsCount = 0,
  } = data ?? {};

  if (!students.length) {
    return (
      <EmptyState
        title="No students found in your scope"
        hint={
          currentSchool || currentClass
            ? `No registered students found for ${[currentSchool, currentClass && `Class ${currentClass}`].filter(Boolean).join(" · ")}.`
            : "Set your school and class in your profile to view students from your classroom."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Performance Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Students</p>
            <p className="font-display text-2xl font-bold">{students.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Active Quiz Takers</p>
            <p className="font-display text-2xl font-bold">{activeStudentsCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <ClipboardCheck className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Quizzes Attempted</p>
            <p className="font-display text-2xl font-bold text-primary">{totalAttempts}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Completed Quizzes</p>
            <p className="font-display text-2xl font-bold">{completedQuizzes}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg Accuracy</p>
            <p className="font-display text-2xl font-bold text-primary">{avgAccuracy}%</p>
          </div>
        </Card>
      </div>

      {/* Student Performance Table */}
      <Card className="overflow-x-auto p-0">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-semibold">Student Leaderboard & Progress</h2>
          <p className="text-xs text-muted-foreground">
            Ranked by XP with quiz completion rates, accuracy scores, and badge progress.
          </p>
        </div>

        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Rank & Student</th>
              <th className="px-5 py-3">Class</th>
              <th className="px-5 py-3">Total XP</th>
              <th className="px-5 py-3">Quizzes (Done / Total)</th>
              <th className="px-5 py-3">Badge Progress</th>
              <th className="px-5 py-3">Accuracy</th>
              <th className="px-5 py-3">Individual Scores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student, idx) => {
              const accuracy = student.stats?.total
                ? Math.round((student.stats.score / student.stats.total) * 100)
                : 0;
              const isExpanded = expandedStudentId === student.id;

              return (
                <Fragment key={student.id}>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{student.full_name}</p>
                          <span className="block text-xs text-muted-foreground">
                            {student.school || "—"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{student.class_name || "—"}</td>
                    <td className="px-5 py-3 font-bold text-primary">{student.xp ?? 0} XP</td>
                    <td className="px-5 py-3">
                      <span className="font-medium">{student.stats?.completedCount ?? 0}</span>
                      <span className="text-muted-foreground"> / {student.stats?.attemptsCount ?? 0}</span>
                    </td>
                    <td className="px-5 py-3 min-w-[170px]">
                      <div className="space-y-1">
                        <Progress value={student.progress ?? 0} />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{Math.round(student.progress ?? 0)}%</span>
                          <span className="truncate max-w-[110px]" title={student.nextBadgeName}>
                            {student.nextBadgeName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Chip
                        tone={
                          accuracy >= 70 ? "success" : accuracy >= 40 ? "accent" : accuracy > 0 ? "danger" : "muted"
                        }
                      >
                        {accuracy}%
                      </Chip>
                    </td>
                    <td className="px-5 py-3">
                      {student.stats?.history?.length ? (
                        <button
                          type="button"
                          onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              Hide scores <ChevronUp className="size-3.5" />
                            </>
                          ) : (
                            <>
                              View scores ({student.stats.history.length}) <ChevronDown className="size-3.5" />
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No attempts yet</span>
                      )}
                    </td>
                  </tr>

                  {/* Individual Quiz Scores Dropdown */}
                  {isExpanded && student.stats?.history && (
                    <tr className="bg-muted/30">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="space-y-3 rounded-2xl border border-border bg-background p-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                              Quiz History for {student.full_name}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {student.stats.history.length} recorded {student.stats.history.length === 1 ? "attempt" : "attempts"}
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {student.stats.history.map((attempt) => {
                              const attemptAcc = attempt.total > 0
                                ? Math.round((attempt.score / attempt.total) * 100)
                                : 0;
                              return (
                                <div
                                  key={attempt.id}
                                  className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3 text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-foreground">{attempt.category} Quiz</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {new Date(attempt.created_at).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Chip
                                      tone={attemptAcc >= 70 ? "success" : attemptAcc >= 50 ? "accent" : "danger"}
                                    >
                                      {attempt.score} / {attempt.total} ({attemptAcc}%)
                                    </Chip>
                                  </div>
                                </div>
                              );
                            })}
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
