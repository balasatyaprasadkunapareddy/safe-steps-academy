-- Migration: Allow authenticated users to view profiles and user_roles, and backfill user_roles
-- Execute this migration in your Supabase SQL Editor.

-- 1. Update profiles RLS policy to allow all authenticated users to read profiles
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- 2. Update user_roles RLS policy to allow all authenticated users to read user roles
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;

CREATE POLICY "user_roles_select_all" ON public.user_roles
  FOR SELECT TO authenticated
  USING (true);

-- 3. Backfill teacher role rows for existing accounts with raw_user_meta_data role = 'teacher'
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'teacher'::public.app_role
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'teacher'
  AND id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'teacher')
ON CONFLICT DO NOTHING;

-- 4. Backfill student role rows for existing accounts with raw_user_meta_data role = 'student' or null
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'student'::public.app_role
FROM auth.users
WHERE (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' = 'student')
  AND id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'student')
ON CONFLICT DO NOTHING;
