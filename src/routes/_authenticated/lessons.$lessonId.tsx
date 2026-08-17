import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button, Card, Chip, EmptyState, Spinner } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { lessonImage } from "@/lib/safesteps";

export const Route = createFileRoute("/_authenticated/lessons/$lessonId")({
  head: () => ({
    meta: [
      { title: "Lesson — SafeSteps" },
      {
        name: "description",
        content: "A SafeSteps road safety lesson with illustrations and practical safety tips.",
      },
      { property: "og:title", content: "Lesson — SafeSteps" },
      {
        property: "og:description",
        content: "Read this SafeSteps road safety lesson and its key tips.",
      },
    ],
  }),
  component: LessonDetail,
});

function LessonDetail() {
  const { lessonId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Spinner label="Loading lesson" />;
  if (!data)
    return <EmptyState title="Lesson not found" hint="It may have been removed by your teacher." />;

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        to="/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All lessons
      </Link>

      <img
        src={lessonImage(data.image_key)}
        alt={data.title}
        loading="lazy"
        width={1024}
        height={640}
        className="mt-4 h-64 w-full rounded-3xl object-cover shadow-lift"
      />

      <Chip tone="accent" className="mt-6">
        {data.category}
      </Chip>
      <h1 className="mt-3 font-display text-3xl font-bold">{data.title}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{data.summary}</p>

      <p className="mt-6 whitespace-pre-line leading-relaxed">{data.content}</p>

      <Card className="mt-8 bg-primary-soft">
        <h2 className="font-display text-lg font-semibold text-primary">Safety tips</h2>
        <ul className="mt-4 space-y-3">
          {data.tips.map((tip) => (
            <li key={tip} className="flex gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              {tip}
            </li>
          ))}
        </ul>
      </Card>

      <Link to="/quiz" className="mt-8 block">
        <Button size="lg" className="w-full">
          Test yourself with a quiz
        </Button>
      </Link>
    </article>
  );
}
