import { supabase } from "@/integrations/supabase/client";

type RoleName = "student" | "teacher";

type AuthMetadata = Record<string, unknown>;

function normalizeRole(value: unknown): RoleName | null {
  return typeof value === "string" && (value === "teacher" || value === "student")
    ? (value as RoleName)
    : null;
}

function normalizeText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function ensureProfileAndRole(userId: string | undefined, metadata?: AuthMetadata) {
  if (!userId) return null;

  const roleFromMetadata = normalizeRole(metadata?.["role"]);
  const desiredRole = roleFromMetadata ?? "student";

  const fullName = normalizeText(metadata?.["full_name"]);
  const location = normalizeText(metadata?.["location"]);
  const school = normalizeText(metadata?.["school"]);
  const className = normalizeText(metadata?.["class_name"]);

  try {
    const { data: profile, error: profileReadError } = await supabase
      .from("profiles")
      .select("id, full_name, school, class_name")
      .eq("id", userId)
      .maybeSingle();
    if (profileReadError) throw profileReadError;

    if (!profile) {
      const { error: profileInsertError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: fullName ?? "Student",
        school,
        class_name: className,
        xp: 0,
      });
      if (profileInsertError) throw profileInsertError;
    } else {
      const profileUpdate: Partial<{
        full_name: string;
        school: string | null;
        class_name: string | null;
      }> = {};

      if (fullName !== null && fullName !== undefined) {
        profileUpdate.full_name = fullName;
      }
      if (school !== null && school !== undefined) {
        profileUpdate.school = school;
      }
      if (className !== null && className !== undefined) {
        profileUpdate.class_name = className;
      }

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", userId);
        if (profileUpdateError) throw profileUpdateError;
      }
    }
  } catch (profileError) {
    console.warn("[profile] Could not sync profile row", profileError);
  }

  try {
    const authUpdate: Record<string, unknown> = {};
    if (fullName !== null && fullName !== undefined) authUpdate["full_name"] = fullName;
    if (location !== null && location !== undefined) authUpdate["location"] = location;
    if (school !== null && school !== undefined) authUpdate["school"] = school;
    if (className !== null && className !== undefined) authUpdate["class_name"] = className;
    if (roleFromMetadata !== null) authUpdate["role"] = desiredRole;

    if (Object.keys(authUpdate).length > 0) {
      await supabase.auth.updateUser({
        data: authUpdate,
      });
    }
  } catch (metadataError) {
    console.warn("[profile] Could not sync auth metadata", metadataError);
  }

  let existingRoles: RoleName[] = [];
  try {
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesError) throw rolesError;

    existingRoles = (rolesData ?? [])
      .map((row) => row.role)
      .filter((role): role is RoleName => role === "student" || role === "teacher");

    const shouldInsertRole =
      roleFromMetadata !== null
        ? !existingRoles.includes(roleFromMetadata)
        : existingRoles.length === 0;
    if (shouldInsertRole) {
      const roleToInsert = roleFromMetadata ?? "student";
      try {
        const { error: roleInsertError } = await supabase.from("user_roles").insert({
          user_id: userId,
          role: roleToInsert,
        });
        if (roleInsertError) throw roleInsertError;
      } catch (roleInsertError) {
        console.warn(
          "[profile] Could not create role row; continuing with metadata-based role",
          roleInsertError,
        );
      }
    }
  } catch (roleError) {
    console.warn(
      "[profile] Could not read role rows; continuing with metadata-based role",
      roleError,
    );
  }

  if (roleFromMetadata) {
    existingRoles = Array.from(new Set([roleFromMetadata, ...existingRoles]));
  }

  return { desiredRole, existingRoles };
}
