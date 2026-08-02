import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ShieldCheck } from "lucide-react";

import { Button, Card, EmptyState, Spinner } from "@/components/ui-kit";
import { useProfile, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/certificate")({
  head: () => ({
    meta: [
      { title: "Completion Certificate — SafeSteps" },
      { name: "description", content: "Download your SafeSteps road safety completion certificate." },
      { property: "og:title", content: "Completion Certificate — SafeSteps" },
      { property: "og:description", content: "A printable certificate for completing the SafeSteps road safety programme." },
    ],
  }),
  component: CertificatePage,
});

const REQUIRED_XP = 100;

function CertificatePage() {
  const { session } = useSession();
  const { data: me } = useProfile();

  const { data, isLoading } = useQuery({
    queryKey: ["certificate", session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("score, total")
        .eq("user_id", session!.user.id);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !me) return <Spinner label="Preparing certificate" />;

  const xp = me.profile?.xp ?? 0;
  const attempts = data ?? [];
  const best = attempts.reduce((acc, a) => Math.max(acc, Math.round((a.score / a.total) * 100)), 0);

  if (xp < REQUIRED_XP) {
    return (
      <EmptyState
        title={`Earn ${REQUIRED_XP} XP to unlock your certificate`}
        hint={`You have ${xp} XP. Complete more quizzes to reach ${REQUIRED_XP} XP.`}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Your certificate</h1>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Print / Save as PDF
        </Button>
      </div>

      <Card className="border-4 border-primary p-10 text-center">
        <ShieldCheck className="mx-auto size-12 text-primary" />
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Certificate of Completion</p>
        <h2 className="mt-6 font-display text-4xl font-extrabold">{me.profile?.full_name}</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          has successfully completed the SafeSteps Traffic Safety Learning Programme
        </p>
        <div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-display text-2xl font-bold text-primary">{xp}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-primary">{attempts.length}</p>
            <p className="text-xs text-muted-foreground">Quizzes</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-primary">{best}%</p>
            <p className="text-xs text-muted-foreground">Best score</p>
          </div>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          {me.profile?.school || "School"} · Issued {new Date().toLocaleDateString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">SafeSteps — Road Safety Community Service Initiative</p>
      </Card>
    </div>
  );
}
