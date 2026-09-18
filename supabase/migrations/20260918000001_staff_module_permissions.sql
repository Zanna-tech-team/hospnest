-- ============================================================================
-- HOSPNEST CLINICAL PLATFORM
-- MIGRATION: STAFF MODULE PERMISSIONS & DYNAMIC ACCESS DELEGATION
-- ============================================================================

-- 1. Add module_permissions column to staff and user_roles
ALTER TABLE public.staff 
  ADD COLUMN IF NOT EXISTS module_permissions TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_roles 
  ADD COLUMN IF NOT EXISTS module_permissions TEXT[] NOT NULL DEFAULT '{}';

-- 2. Index on module_permissions for high-speed permission filtering
CREATE INDEX IF NOT EXISTS idx_staff_module_permissions ON public.staff USING gin (module_permissions);
CREATE INDEX IF NOT EXISTS idx_user_roles_module_permissions ON public.user_roles USING gin (module_permissions);

-- 3. Helper function allowing hospital admins to update staff module_permissions
CREATE OR REPLACE FUNCTION public.can_manage_staff_permissions(_hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS \$\$
  SELECT public.is_super_admin() OR public.is_hospital_admin(_hospital_id);
\$\$;

