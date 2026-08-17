-- Tighten teacher-related access and keep the leaderboard scoped to the current student's school/class.

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.school IS NOT NULL
        AND viewer.class_name IS NOT NULL
        AND viewer.school = public.profiles.school
        AND viewer.class_name = public.profiles.class_name
    )
  );

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_all" ON public.user_roles
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE VIEW public.student_profiles AS
  SELECT p.id, p.full_name, p.school, p.class_name, p.xp
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'student';
GRANT SELECT ON public.student_profiles TO authenticated;

-- Backfill any existing users who were created before user_roles had consistent metadata
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'teacher'::public.app_role
FROM auth.users
WHERE COALESCE(raw_user_meta_data->>'role', 'student') = 'teacher'
  AND id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'teacher'
  );

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'student'::public.app_role
FROM auth.users
WHERE COALESCE(raw_user_meta_data->>'role', 'student') = 'student'
  AND id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'student'
  );

DROP POLICY IF EXISTS "lessons_write" ON public.lessons;
CREATE POLICY "lessons_write" ON public.lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "signs_write" ON public.traffic_signs;
CREATE POLICY "signs_write" ON public.traffic_signs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "questions_write" ON public.quiz_questions;
CREATE POLICY "questions_write" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "badges_write" ON public.badges;
CREATE POLICY "badges_write" ON public.badges
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "attempts_select" ON public.quiz_attempts;
CREATE POLICY "attempts_select" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "user_badges_select" ON public.user_badges;
CREATE POLICY "user_badges_select" ON public.user_badges
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "survey_select" ON public.survey_responses;
CREATE POLICY "survey_select" ON public.survey_responses
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'teacher'
    )
  );
