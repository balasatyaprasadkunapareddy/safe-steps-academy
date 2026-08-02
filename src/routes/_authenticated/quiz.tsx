import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, Card, Chip, EmptyState, Progress, Spinner } from "@/components/ui-kit";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { awardXp } from "@/lib/awards";
import { XP_PER_CORRECT } from "@/lib/safesteps";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quiz")({
  head: () => ({
    meta: [
      { title: "Road Safety Quiz — SafeSteps" },
      { name: "description", content: "Multiple-choice road safety quiz with instant feedback, explanations and XP rewards." },
      { property: "og:title", content: "Road Safety Quiz — SafeSteps" },
      { property: "og:description", content: "Test your traffic safety knowledge and earn XP and badges." },
    ],
  }),
  component: QuizPage,
});

const QUESTIONS_PER_QUIZ = 8;

function QuizPage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("All");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seed, setSeed] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz-questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quiz_questions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(
    () => ["All", ...Array.from(new Set((data ?? []).map((q) => q.category)))],
    [data],
  );

  const questions = useMemo(() => {
    const pool = (data ?? []).filter((q) => category === "All" || q.category === category);
    return [...pool].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_QUIZ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, category, seed]);

  if (isLoading) return <Spinner label="Loading questions" />;
  if (!data?.length) return <EmptyState title="No quiz questions yet" hint="Your teacher will add questions soon." />;

  function reset(newCategory = category) {
    setCategory(newCategory);
    setStarted(false);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setSeed((s) => s + 1);
  }

  async function finish(finalScore: number) {
    setFinished(true);
    if (!session) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("quiz_attempts").insert({
        user_id: session.user.id,
        category,
        score: finalScore,
        total: questions.length,
      });
      if (error) throw error;

      const { unlocked } = await awardXp(session.user.id, finalScore * XP_PER_CORRECT);
      queryClient.invalidateQueries();
      toast.success(`+${finalScore * XP_PER_CORRECT} XP earned!`);
      unlocked.forEach((b) => toast.success(`Badge unlocked: ${b.name} 🏅`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your attempt");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (index + 1 >= questions.length) {
      void finish(score);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-bold">Road safety quiz</h1>
        <p className="mt-2 text-muted-foreground">
          {QUESTIONS_PER_QUIZ} questions, instant feedback, {XP_PER_CORRECT} XP per correct answer.
        </p>
        <Card className="mt-6">
          <p className="text-sm font-semibold">Choose a topic</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Button key={c} size="sm" variant={category === c ? "primary" : "outline"} onClick={() => reset(c)}>
                {c}
              </Button>
            ))}
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={() => setStarted(true)}>
            Start quiz
          </Button>
        </Card>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="animate-rise text-center">
          <p className="text-sm text-muted-foreground">Quiz complete</p>
          <p className="mt-2 font-display text-6xl font-extrabold text-primary">
            {score}/{questions.length}
          </p>
          <p className="mt-2 text-lg font-semibold">{pct}% correct</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {saving ? "Saving your score…" : `You earned ${score * XP_PER_CORRECT} XP.`}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={() => reset()}>
              <RotateCcw className="size-4" /> Try again
            </Button>
            <Link to="/leaderboard">
              <Button variant="outline">View leaderboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const q = questions[index]!;
  const answered = selected !== null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <Chip tone="primary">{q.category}</Chip>
      </div>
      <Progress value={((index + (answered ? 1 : 0)) / questions.length) * 100} className="mt-3" />

      <Card className="mt-6 animate-rise" key={q.id}>
        <h1 className="font-display text-xl font-semibold">{q.question}</h1>
        <div className="mt-5 space-y-3">
          {q.options.map((option, i) => {
            const isCorrect = i === q.correct_index;
            const isPicked = selected === i;
            return (
              <button
                key={option}
                disabled={answered}
                onClick={() => {
                  setSelected(i);
                  if (i === q.correct_index) setScore((s) => s + 1);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm transition-colors",
                  !answered && "border-border hover:border-primary hover:bg-primary-soft",
                  answered && isCorrect && "border-success bg-success/10",
                  answered && isPicked && !isCorrect && "border-destructive bg-destructive/10",
                  answered && !isCorrect && !isPicked && "border-border opacity-60",
                )}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
                {answered && isCorrect && <CheckCircle2 className="ml-auto size-5 text-success" />}
                {answered && isPicked && !isCorrect && <XCircle className="ml-auto size-5 text-destructive" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-5 rounded-2xl bg-muted p-4 text-sm">
            <p className="font-semibold">{selected === q.correct_index ? "Correct!" : "Not quite."}</p>
            <p className="mt-1 text-muted-foreground">{q.explanation}</p>
          </div>
        )}

        <Button className="mt-6 w-full" size="lg" disabled={!answered} onClick={next}>
          {index + 1 >= questions.length ? "Finish quiz" : "Next question"}
        </Button>
      </Card>
    </div>
  );
}
