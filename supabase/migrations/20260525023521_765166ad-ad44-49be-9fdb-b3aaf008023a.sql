
-- Restrict configuracoes_empresa SELECT to admin/gerente only
DROP POLICY IF EXISTS "Authenticated can view configuracoes_empresa" ON public.configuracoes_empresa;

CREATE POLICY "Admin/Gerente view configuracoes_empresa"
ON public.configuracoes_empresa
FOR SELECT
TO authenticated
USING (is_admin_or_gerente(auth.uid()));

-- Public-safe branding accessor (logo + names only) for all authenticated users
CREATE OR REPLACE FUNCTION public.get_company_branding()
RETURNS TABLE (
  id uuid,
  logo_url text,
  razao_social text,
  nome_fantasia text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, logo_url, razao_social, nome_fantasia
  FROM public.configuracoes_empresa
  ORDER BY created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_branding() TO authenticated, anon;

-- Remove client-side notification insert capability; only service role may insert now
DROP POLICY IF EXISTS "Users insert own notificacoes" ON public.notificacoes;
