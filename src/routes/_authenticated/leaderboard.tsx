import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Trophy } from "lucide-react";

import { Card, Chip, EmptyState, Spinner } from "@/components/ui-kit";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — SafeSteps" },
      { name: "description", content: "See which students lead the school in road safety XP and badges." },
      { property: "og:title", content: "Leaderboard — SafeSteps" },
      { property: "og:description", content: "Ranked road safety scores across your school." },
    ],
  }),
  component: LeaderboardPage,
});

const rankIcons = [Crown, Trophy, Medal];

function LeaderboardPage() {
  const { session } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, school, class_name, xp")
        .order("xp", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Spinner label="Loading leaderboard" />;
  if (!data?.length) return <EmptyState title="No students yet" />;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
      <p className="mt-2 text-muted-foreground">Ranked by total XP earned from quizzes.</p>

      <Card className="mt-6 p-0">
        <ul className="divide-y divide-border">
          {data.map((p, i) => {
            const Icon = rankIcons[i];
            const isMe = p.id === session?.user.id;
            return (
              <li
                key={p.id}
                className={cn("flex items-center gap-4 px-5 py-4", isMe && "bg-primary-soft")}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted font-display text-sm font-bold">
                  {Icon ? <Icon className="size-4 text-accent-foreground" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.full_name} {isMe && <span className="text-xs text-primary">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[p.school, p.class_name && `Class ${p.class_name}`].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Chip tone="primary">{p.xp} XP</Chip>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
