-- Migration: Fix user_roles RLS policies and backfill missing role rows
-- Run this in the Supabase SQL Editor ONCE.

-- ---------------------------------------------------------------
-- 1. Allow ALL authenticated users to READ all user_roles rows.
--    This is needed so the leaderboard can filter out teacher IDs
--    client-side, and so has_role() works correctly for everyone.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;

CREATE POLICY "user_roles_select_all" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------
-- 2. Backfill teacher role rows for existing accounts that signed
--    up as a teacher but have no row in user_roles yet.
-- ---------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'teacher'::public.app_role
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'teacher'
  AND id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'teacher'
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 3. Backfill student role rows for existing accounts that have
--    no role row at all.
-- ---------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'student'::public.app_role
FROM auth.users
WHERE (
  raw_user_meta_data->>'role' IS NULL
  OR raw_user_meta_data->>'role' = 'student'
)
AND id NOT IN (
  SELECT user_id FROM public.user_roles
)
ON CONFLICT DO NOTHING;
