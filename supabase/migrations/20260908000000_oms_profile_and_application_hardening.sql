-- Production hardening for merged Sysmobyte OMS.
-- Adds profile fields used by the UI and secures organization-scoped applications.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS certification_links text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS achievements text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS position text;

-- Keep legacy certification naming in the application model while storing the
-- actual data in the existing certification_links column.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_applications_org_created
  ON public.applications(organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_application_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.profiles WHERE id = NEW.user_id;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := v_org;
  ELSIF v_org IS NOT NULL AND NEW.organization_id <> v_org AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Application organization does not match the user organization';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_application_organization ON public.applications;
CREATE TRIGGER trg_set_application_organization
BEFORE INSERT OR UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.set_application_organization();

DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own" ON public.applications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (organization_id IS NULL OR organization_id = public.current_user_org_id() OR public.is_super_admin())
);

DROP POLICY IF EXISTS "applications_update_admin" ON public.applications;
CREATE POLICY "applications_update_admin" ON public.applications FOR UPDATE TO authenticated
USING (
  public.is_super_admin()
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
)
WITH CHECK (
  public.is_super_admin()
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
);

DROP POLICY IF EXISTS "applications_select_own_or_admin" ON public.applications;
CREATE POLICY "applications_select_own_or_admin" ON public.applications FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_super_admin()
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
);
