import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Trophy } from "lucide-react";

import { Card, Chip, EmptyState, Spinner } from "@/components/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — SafeSteps" },
      {
        name: "description",
        content: "See which students lead the school in road safety XP and badges.",
      },
      { property: "og:title", content: "Leaderboard — SafeSteps" },
      { property: "og:description", content: "Ranked road safety scores across your school." },
    ],
  }),
  component: LeaderboardPage,
});

const rankIcons = [Crown, Trophy, Medal];

function LeaderboardPage() {
  const { session } = useSession();
  const { data: me } = useProfile();

  const currentSchool = me?.profile?.school?.trim() ?? "";
  const currentClass = me?.profile?.class_name?.trim() ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", currentSchool, currentClass, session?.user.id, me?.isTeacher],
    enabled: Boolean(session?.user.id),
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, school, class_name, xp")
          .order("xp", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const teacherIds = new Set(
        (rolesRes.data ?? []).filter((r) => r.role === "teacher").map((r) => r.user_id),
      );

      // Exclude teachers from student leaderboard
      return (profilesRes.data ?? []).filter((profile) => !teacherIds.has(profile.id));
    },
  });

  if (isLoading) return <Spinner label="Loading leaderboard" />;
  if (!data?.length) return <EmptyState title="No students found" hint="No student scores have been recorded yet." />;

  const schoolList = currentSchool
    ? data.filter((p) => p.school?.trim().toLowerCase() === currentSchool.toLowerCase())
    : data;
  const classList = currentClass
    ? schoolList.filter((p) => p.class_name?.trim().toLowerCase() === currentClass.toLowerCase())
    : schoolList;

  const LeaderboardList = ({ list }: { list: typeof data }) => {
    if (!list.length) return <EmptyState title="No students in this view" hint="Try switching tabs." />;
    return (
      <ul className="divide-y divide-border">
        {list.map((profile, index) => {
          const Icon = rankIcons[index];
          const isMe = profile.id === session?.user.id;
          return (
            <li
              key={profile.id}
              className={cn("flex items-center gap-4 px-5 py-4", isMe && "bg-primary-soft")}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted font-display text-sm font-bold">
                {Icon ? <Icon className="size-4 text-accent-foreground" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {profile.full_name || "Anonymous Student"}{" "}
                  {isMe && <span className="text-xs text-primary">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[profile.school, profile.class_name && `Class ${profile.class_name}`]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <Chip tone="primary">{profile.xp ?? 0} XP</Chip>
            </li>
          );
        })}
      </ul>
    );
  };

  const hasSchoolOrClass = Boolean(currentSchool || currentClass);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
        <p className="mt-1 text-muted-foreground">Ranked by total XP earned from road safety quizzes.</p>
      </div>

      {hasSchoolOrClass ? (
        <Tabs defaultValue={currentClass ? "class" : "school"}>
          <TabsList>
            {currentClass && <TabsTrigger value="class">My Class ({currentClass})</TabsTrigger>}
            {currentSchool && <TabsTrigger value="school">My School ({currentSchool})</TabsTrigger>}
            <TabsTrigger value="all">All Students</TabsTrigger>
          </TabsList>
          {currentClass && (
            <TabsContent value="class">
              <Card className="p-0">
                <LeaderboardList list={classList} />
              </Card>
            </TabsContent>
          )}
          {currentSchool && (
            <TabsContent value="school">
              <Card className="p-0">
                <LeaderboardList list={schoolList} />
              </Card>
            </TabsContent>
          )}
          <TabsContent value="all">
            <Card className="p-0">
              <LeaderboardList list={data} />
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="p-0">
          <LeaderboardList list={data} />
        </Card>
      )}
    </div>
  );
}
