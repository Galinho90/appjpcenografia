
-- Restrict SMTP credentials to admins only
DROP POLICY IF EXISTS "Admin/Gerente view smtp_config" ON public.smtp_config;
DROP POLICY IF EXISTS "Admin/Gerente insert smtp_config" ON public.smtp_config;
DROP POLICY IF EXISTS "Admin/Gerente update smtp_config" ON public.smtp_config;

CREATE POLICY "Admin view smtp_config" ON public.smtp_config
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin insert smtp_config" ON public.smtp_config
FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin update smtp_config" ON public.smtp_config
FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Prevent gerentes from reassigning colaborador.user_id
DROP POLICY IF EXISTS "Admin/Gerente can update colaboradores" ON public.colaboradores;

CREATE POLICY "Admin/Gerente can update colaboradores" ON public.colaboradores
FOR UPDATE TO authenticated
USING (is_admin_or_gerente(auth.uid()))
WITH CHECK (
  is_admin_or_gerente(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_id IS NOT DISTINCT FROM (SELECT user_id FROM public.colaboradores c WHERE c.id = colaboradores.id)
  )
);
