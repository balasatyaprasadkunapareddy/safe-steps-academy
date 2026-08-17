import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { ensureProfileAndRole } from "@/lib/profile";

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue>({ session: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const syncUserProfile = async (nextSession: Session | null) => {
      if (!nextSession?.user?.id) return;

      try {
        await ensureProfileAndRole(
          nextSession.user.id,
          nextSession.user.user_metadata as Record<string, unknown> | undefined,
        );
      } catch (error) {
        console.error("[session] Could not sync profile and role", error);
      }
    };

    // 1. Initial explicit session retrieval (critical for Capacitor cold launch)
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.warn("[session] Error getting initial session", error);
      }
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        void syncUserProfile(data.session);
      }
    });

    // 2. Auth state listener for sign in, sign out, token refresh
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      setSession(next);
      setLoading(false);

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void syncUserProfile(next);
        queryClient.invalidateQueries();
      }
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [
      "profile",
      userId,
      session?.user.user_metadata?.["role"],
      session?.user.user_metadata?.["school"],
      session?.user.user_metadata?.["class_name"],
    ],
    enabled: Boolean(userId),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const profileRes = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (profileRes.error) {
        console.warn("[profile] Could not load profile row", profileRes.error);
      }

      let rolesFromDb: string[] = [];
      try {
        const rolesRes = await supabase.from("user_roles").select("role").eq("user_id", userId!);
        if (rolesRes.error) {
          console.warn("[profile] Could not load role rows", rolesRes.error);
        } else {
          rolesFromDb = (rolesRes.data ?? []).map((row) => row.role);
        }
      } catch (roleError) {
        console.warn("[profile] Role lookup failed", roleError);
      }

      const roleFromMetadata =
        typeof session?.user.user_metadata?.["role"] === "string" &&
          (session.user.user_metadata["role"] === "teacher" ||
            session.user.user_metadata["role"] === "student")
          ? session.user.user_metadata["role"]
          : null;
      const roles = Array.from(
        new Set([...(roleFromMetadata ? [roleFromMetadata] : []), ...rolesFromDb]),
      );

      return {
        profile: profileRes.data ?? null,
        roles,
        isTeacher: roles.includes("teacher"),
      };
    },
  });
}