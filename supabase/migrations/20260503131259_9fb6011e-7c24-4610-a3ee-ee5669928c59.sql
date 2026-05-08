
-- 1. Remove permissive anon policies on sensitive tables
DROP POLICY IF EXISTS "Temp anon delete colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Temp anon insert colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Temp anon select colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Temp anon update colaboradores" ON public.colaboradores;

DROP POLICY IF EXISTS "Temp anon delete diarias" ON public.diarias;
DROP POLICY IF EXISTS "Temp anon insert diarias" ON public.diarias;
DROP POLICY IF EXISTS "Temp anon select diarias" ON public.diarias;
DROP POLICY IF EXISTS "Temp anon update diarias" ON public.diarias;

DROP POLICY IF EXISTS "Temp anon delete fechamentos" ON public.fechamentos;
DROP POLICY IF EXISTS "Temp anon insert fechamentos" ON public.fechamentos;
DROP POLICY IF EXISTS "Temp anon select fechamentos" ON public.fechamentos;
DROP POLICY IF EXISTS "Temp anon update fechamentos" ON public.fechamentos;

DROP POLICY IF EXISTS "Temp anon insert transacoes" ON public.transacoes_log;
DROP POLICY IF EXISTS "Temp anon select transacoes" ON public.transacoes_log;

DROP POLICY IF EXISTS "Temp anon insert configuracoes_empresa" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "Temp anon select configuracoes_empresa" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "Temp anon update configuracoes_empresa" ON public.configuracoes_empresa;

-- 2. Tighten categorias (was public USING true for all ops)
DROP POLICY IF EXISTS "categorias delete all" ON public.categorias;
DROP POLICY IF EXISTS "categorias insert all" ON public.categorias;
DROP POLICY IF EXISTS "categorias select all" ON public.categorias;
DROP POLICY IF EXISTS "categorias update all" ON public.categorias;

DROP POLICY IF EXISTS "Authenticated view categorias" ON public.categorias;
CREATE POLICY "Authenticated view categorias" ON public.categorias
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin/Gerente insert categorias" ON public.categorias;
CREATE POLICY "Admin/Gerente insert categorias" ON public.categorias
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gerente(auth.uid()));
DROP POLICY IF EXISTS "Admin/Gerente update categorias" ON public.categorias;
CREATE POLICY "Admin/Gerente update categorias" ON public.categorias
  FOR UPDATE TO authenticated USING (public.is_admin_or_gerente(auth.uid()));
DROP POLICY IF EXISTS "Admin delete categorias" ON public.categorias;
CREATE POLICY "Admin delete categorias" ON public.categorias
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Tighten clientes
DROP POLICY IF EXISTS "Clientes são visíveis para todos autenticados ou anon" ON public.clientes;
DROP POLICY IF EXISTS "Delete clientes liberado" ON public.clientes;
DROP POLICY IF EXISTS "Insert clientes liberado" ON public.clientes;
DROP POLICY IF EXISTS "Update clientes liberado" ON public.clientes;

DROP POLICY IF EXISTS "Authenticated view clientes" ON public.clientes;
CREATE POLICY "Authenticated view clientes" ON public.clientes
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin/Gerente insert clientes" ON public.clientes;
CREATE POLICY "Admin/Gerente insert clientes" ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gerente(auth.uid()));
DROP POLICY IF EXISTS "Admin/Gerente update clientes" ON public.clientes;
CREATE POLICY "Admin/Gerente update clientes" ON public.clientes
  FOR UPDATE TO authenticated USING (public.is_admin_or_gerente(auth.uid()));
DROP POLICY IF EXISTS "Admin delete clientes" ON public.clientes;
CREATE POLICY "Admin delete clientes" ON public.clientes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Tighten lancamentos
DROP POLICY IF EXISTS "lancamentos delete all" ON public.lancamentos;
DROP POLICY IF EXISTS "lancamentos insert all" ON public.lancamentos;
DROP POLICY IF EXISTS "lancamentos select all" ON public.lancamentos;
DROP POLICY IF EXISTS "lancamentos update all" ON public.lancamentos;

DROP POLICY IF EXISTS "Authenticated view lancamentos" ON public.lancamentos;
CREATE POLICY "Authenticated view lancamentos" ON public.lancamentos
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin/Gerente insert lancamentos" ON public.lancamentos;
CREATE POLICY "Admin/Gerente insert lancamentos" ON public.lancamentos
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gerente(auth.uid()));
DROP POLICY IF EXISTS "Admin/Gerente update lancamentos" ON public.lancamentos;
CREATE POLICY "Admin/Gerente update lancamentos" ON public.lancamentos
  FOR UPDATE TO authenticated USING (public.is_admin_or_gerente(auth.uid()));
DROP POLICY IF EXISTS "Admin delete lancamentos" ON public.lancamentos;
CREATE POLICY "Admin delete lancamentos" ON public.lancamentos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Restrict SECURITY DEFINER function execution to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_gerente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_gerente(uuid) TO authenticated;

-- 6. Storage: restrict public bucket listing — allow per-object reads only, no LIST of all objects.
-- Drop overly broad SELECT policies if any exist for these buckets.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (policyname ILIKE '%avatars%public%' OR policyname ILIKE '%branding%public%' OR policyname ILIKE '%diaristas%public%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- Allow public read of individual objects in public buckets (no listing required because objects are accessed by full path)
CREATE POLICY "Public read avatars objects" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Public read branding objects" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'branding');
CREATE POLICY "Public read diaristas-fotos objects" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'diaristas-fotos');
