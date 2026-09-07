-- Final Sysmobyte OMS merge: employee applications / leave requests.
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other' CHECK (type IN ('leave','remote','half_day','other')),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "applications_select_own_or_admin" ON public.applications;
CREATE POLICY "applications_select_own_or_admin" ON public.applications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_super_admin() OR EXISTS (
  SELECT 1 FROM public.organization_members om WHERE om.organization_id = applications.organization_id AND om.user_id = auth.uid() AND om.role IN ('admin','super_admin')
));
DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own" ON public.applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "applications_update_admin" ON public.applications;
CREATE POLICY "applications_update_admin" ON public.applications FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_super_admin() OR EXISTS (
  SELECT 1 FROM public.organization_members om WHERE om.organization_id = applications.organization_id AND om.user_id = auth.uid() AND om.role IN ('admin','super_admin')
));
CREATE INDEX IF NOT EXISTS idx_applications_org_user ON public.applications(organization_id,user_id,created_at DESC);
