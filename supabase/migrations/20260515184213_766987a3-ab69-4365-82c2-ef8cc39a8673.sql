
-- diarias: split SELECT
DROP POLICY IF EXISTS "Authenticated can view diarias" ON public.diarias;
CREATE POLICY "Admin/Gerente view all diarias" ON public.diarias
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "Diarista view own diarias" ON public.diarias
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = diarias.colaborador_id AND c.user_id = auth.uid()
  ));

-- fechamentos: split SELECT
DROP POLICY IF EXISTS "Authenticated can view fechamentos" ON public.fechamentos;
CREATE POLICY "Admin/Gerente view all fechamentos" ON public.fechamentos
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "Diarista view own fechamentos" ON public.fechamentos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = fechamentos.colaborador_id AND c.user_id = auth.uid()
  ));

-- lancamentos: split SELECT
DROP POLICY IF EXISTS "Authenticated view lancamentos" ON public.lancamentos;
CREATE POLICY "Admin/Gerente view all lancamentos" ON public.lancamentos
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));
CREATE POLICY "Diarista view own lancamentos" ON public.lancamentos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = lancamentos.colaborador_id AND c.user_id = auth.uid()
  ));

-- transacoes_log: restrict SELECT to admin/gerente
DROP POLICY IF EXISTS "Authenticated can view transacoes" ON public.transacoes_log;
CREATE POLICY "Admin/Gerente view transacoes_log" ON public.transacoes_log
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

-- clientes: restrict SELECT to admin/gerente
DROP POLICY IF EXISTS "Authenticated view clientes" ON public.clientes;
CREATE POLICY "Admin/Gerente view clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

-- notificacoes: prevent spoofing across users (service role bypasses RLS)
DROP POLICY IF EXISTS "Authenticated can insert notificacoes" ON public.notificacoes;
CREATE POLICY "Users insert own notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
