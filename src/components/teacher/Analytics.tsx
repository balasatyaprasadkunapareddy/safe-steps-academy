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

import { Card, Chip, EmptyState, Spinner } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { surveyQuestions } from "@/lib/safesteps";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function SurveyAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["survey-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("survey_responses").select("answers, awareness_score");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Spinner label="Loading survey analytics" />;
  if (!data?.length) return <EmptyState title="No survey responses yet" hint="Ask students to complete the survey." />;

  const overall = Math.round(data.reduce((sum, r) => sum + r.awareness_score, 0) / data.length);

  const helmet = surveyQuestions[0]!;
  const helmetCounts = helmet.options.map((option, i) => ({
    name: option,
    value: data.filter((r) => (r.answers as Record<string, number>)[helmet.id] === i).length,
  }));

  const perQuestion = surveyQuestions.map((q) => {
    const aware = data.filter((r) => (r.answers as Record<string, number>)[q.id] === q.awareIndex).length;
    return {
      name: q.id,
      aware: Math.round((aware / data.length) * 100),
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Total responses</p>
          <p className="font-display text-3xl font-bold text-primary">{data.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Overall awareness score</p>
          <p className="font-display text-3xl font-bold text-primary">{overall}%</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Awareness level</p>
          <Chip tone={overall >= 70 ? "success" : overall >= 45 ? "accent" : "danger"} className="mt-2">
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
                  {helmetCounts.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
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
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: async () => {
      const [profiles, attempts] = await Promise.all([
        supabase.from("profiles").select("id, full_name, school, class_name, xp").order("xp", { ascending: false }),
        supabase.from("quiz_attempts").select("user_id, score, total"),
      ]);
      if (profiles.error) throw profiles.error;
      const byUser = new Map<string, { attempts: number; score: number; total: number }>();
      for (const a of attempts.data ?? []) {
        const entry = byUser.get(a.user_id) ?? { attempts: 0, score: 0, total: 0 };
        entry.attempts += 1;
        entry.score += a.score;
        entry.total += a.total;
        byUser.set(a.user_id, entry);
      }
      return (profiles.data ?? []).map((p) => ({ ...p, stats: byUser.get(p.id) }));
    },
  });

  if (isLoading) return <Spinner label="Loading students" />;
  if (!data?.length) return <EmptyState title="No students registered yet" />;

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-5 py-3">Student</th>
            <th className="px-5 py-3">Class</th>
            <th className="px-5 py-3">XP</th>
            <th className="px-5 py-3">Quizzes</th>
            <th className="px-5 py-3">Accuracy</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((s) => {
            const accuracy = s.stats?.total ? Math.round((s.stats.score / s.stats.total) * 100) : 0;
            return (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium">
                  {s.full_name}
                  <span className="block text-xs text-muted-foreground">{s.school || "—"}</span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{s.class_name || "—"}</td>
                <td className="px-5 py-3 font-semibold text-primary">{s.xp}</td>
                <td className="px-5 py-3">{s.stats?.attempts ?? 0}</td>
                <td className="px-5 py-3">
                  <Chip tone={accuracy >= 60 ? "success" : accuracy > 0 ? "accent" : "muted"}>{accuracy}%</Chip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
