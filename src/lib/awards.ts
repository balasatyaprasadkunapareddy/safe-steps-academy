import { supabase } from "@/integrations/supabase/client";

/** Adds XP to the current user's profile and unlocks any newly-earned badges. */
export async function awardXp(userId: string, xp: number) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("xp")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;

  const newXp = (profile?.xp ?? 0) + xp;
  const { error: updateError } = await supabase.from("profiles").update({ xp: newXp }).eq("id", userId);
  if (updateError) throw updateError;

  const { data: badges } = await supabase.from("badges").select("id, name, min_xp").lte("min_xp", newXp);
  const { data: owned } = await supabase.from("user_badges").select("badge_id").eq("user_id", userId);
  const ownedIds = new Set((owned ?? []).map((b) => b.badge_id));
  const unlocked = (badges ?? []).filter((b) => !ownedIds.has(b.id));

  if (unlocked.length) {
    await supabase.from("user_badges").insert(unlocked.map((b) => ({ user_id: userId, badge_id: b.id })));
  }

  return { newXp, unlocked };
}
