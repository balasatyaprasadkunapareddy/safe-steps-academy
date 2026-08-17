import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { Button, Card, Chip, Spinner } from "@/components/ui-kit";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { scoreSurvey, surveyQuestions } from "@/lib/safesteps";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/survey")({
  head: () => ({
    meta: [
      { title: "Traffic Awareness Survey — SafeSteps" },
      {
        name: "description",
        content:
          "Answer the community traffic awareness survey and get your personal awareness score.",
      },
      { property: "og:title", content: "Traffic Awareness Survey — SafeSteps" },
      {
        property: "og:description",
        content: "Contribute to your school's road safety awareness study.",
      },
    ],
  }),
  component: SurveyPage,
});

function SurveyPage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["my-survey", session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Spinner label="Loading survey" />;

  async function submit() {
    if (Object.keys(answers).length < surveyQuestions.length) {
      toast.error("Please answer all questions");
      return;
    }
    setSaving(true);
    try {
      const awareness = scoreSurvey(answers);
      const { error } = await supabase.from("survey_responses").insert({
        user_id: session!.user.id,
        answers,
        awareness_score: awareness,
      });
      if (error) throw error;
      queryClient.invalidateQueries();
      toast.success(`Thank you! Your awareness score is ${awareness}%`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit survey");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Traffic awareness survey</h1>
      <p className="mt-2 text-muted-foreground">
        Six quick questions. Your answers feed the school's road safety awareness study.
      </p>

      {existing && (
        <Card className="mt-6 bg-primary-soft">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-6 text-primary" />
            <div>
              <p className="font-semibold text-primary">You have already submitted the survey</p>
              <p className="text-sm text-muted-foreground">
                Your awareness score was {existing.awareness_score}% on{" "}
                {new Date(existing.created_at).toLocaleDateString()}. You may submit an updated
                response below.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-6 space-y-4">
        {surveyQuestions.map((q, qi) => (
          <Card key={q.id}>
            <div className="flex items-start gap-3">
              <Chip tone="muted">{qi + 1}</Chip>
              <h2 className="font-semibold">{q.question}</h2>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {q.options.map((option, i) => (
                <button
                  key={option}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition-colors",
                    answers[q.id] === i
                      ? "border-primary bg-primary-soft font-medium text-primary"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Button size="lg" className="mt-6 w-full" onClick={submit} disabled={saving}>
        {saving ? "Submitting…" : "Submit survey"}
      </Button>
    </div>
  );
}
