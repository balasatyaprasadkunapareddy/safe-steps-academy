-- Allow authenticated users to create or update their own role rows for self-healing role assignment.
GRANT INSERT, UPDATE ON public.user_roles TO authenticated;

CREATE POLICY "user_roles_insert_own" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_roles_update_own" ON public.user_roles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
