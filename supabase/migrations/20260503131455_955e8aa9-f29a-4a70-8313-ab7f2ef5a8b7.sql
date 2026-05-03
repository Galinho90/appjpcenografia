
-- 1. colaboradores: restrict SELECT — visualizador only own row
DROP POLICY IF EXISTS "Authenticated can view colaboradores" ON public.colaboradores;

CREATE POLICY "Admin/Gerente view all colaboradores" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "Diarista view own colaborador" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. storage: remove anon write policies on diaristas-fotos and require auth
DROP POLICY IF EXISTS "Anon delete diaristas-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Anon update diaristas-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload diaristas-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Public read diaristas-fotos" ON storage.objects;

CREATE POLICY "Auth upload diaristas-fotos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'diaristas-fotos');

CREATE POLICY "Auth update diaristas-fotos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'diaristas-fotos');

CREATE POLICY "Auth delete diaristas-fotos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'diaristas-fotos');

-- 3. Restrict EXECUTE on trigger-only SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
