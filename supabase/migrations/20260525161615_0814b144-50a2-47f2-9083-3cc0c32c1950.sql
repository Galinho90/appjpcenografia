
-- Profiles: restrict SELECT
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin/Gerente view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_admin_or_gerente(auth.uid()));

-- Notas fiscais: restrict diarista UPDATE to pendente
DROP POLICY IF EXISTS "Diarista update own notas_fiscais" ON public.notas_fiscais;

CREATE POLICY "Diarista update own notas_fiscais"
ON public.notas_fiscais FOR UPDATE
TO authenticated
USING (
  status = 'pendente'
  AND EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = notas_fiscais.colaborador_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  status = 'pendente'
  AND EXISTS (
    SELECT 1 FROM colaboradores c
    WHERE c.id = notas_fiscais.colaborador_id AND c.user_id = auth.uid()
  )
);
