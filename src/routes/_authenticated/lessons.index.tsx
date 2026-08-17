import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { Card, Chip, EmptyState, Spinner } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { lessonImage } from "@/lib/safesteps";

export const Route = createFileRoute("/_authenticated/lessons/")({
  head: () => ({
    meta: [
      { title: "Safety Lessons — SafeSteps" },
      {
        name: "description",
        content:
          "Pedestrian, bicycle, two-wheeler and school bus safety lessons with practical tips.",
      },
      { property: "og:title", content: "Safety Lessons — SafeSteps" },
      {
        property: "og:description",
        content: "Learn road safety with illustrated lessons written for school students.",
      },
    ],
  }),
  component: LessonsPage,
});

function LessonsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("*").order("order_index");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Spinner label="Loading lessons" />;
  if (!data?.length)
    return <EmptyState title="No lessons yet" hint="Your teacher will add lessons soon." />;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Learning modules</h1>
      <p className="mt-2 text-muted-foreground">
        Four core modules that cover how students travel every day.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {data.map((lesson) => (
          <Link key={lesson.id} to="/lessons/$lessonId" params={{ lessonId: lesson.id }}>
            <Card className="h-full overflow-hidden p-0 transition-shadow hover:shadow-lift">
              <img
                src={lessonImage(lesson.image_key)}
                alt={lesson.title}
                loading="lazy"
                width={1024}
                height={640}
                className="h-44 w-full object-cover"
              />
              <div className="p-6">
                <Chip tone="accent">{lesson.category}</Chip>
                <h2 className="mt-3 font-display text-xl font-bold">{lesson.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{lesson.summary}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Read lesson <ArrowRight className="size-4" />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
