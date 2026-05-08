
-- Colaboradores: allow anon full access temporarily
DROP POLICY IF EXISTS "Temp anon select colaboradores" ON public.colaboradores;
CREATE POLICY "Temp anon select colaboradores" ON public.colaboradores FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon insert colaboradores" ON public.colaboradores;
CREATE POLICY "Temp anon insert colaboradores" ON public.colaboradores FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Temp anon update colaboradores" ON public.colaboradores;
CREATE POLICY "Temp anon update colaboradores" ON public.colaboradores FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon delete colaboradores" ON public.colaboradores;
CREATE POLICY "Temp anon delete colaboradores" ON public.colaboradores FOR DELETE TO anon USING (true);

-- Diarias
DROP POLICY IF EXISTS "Temp anon select diarias" ON public.diarias;
CREATE POLICY "Temp anon select diarias" ON public.diarias FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon insert diarias" ON public.diarias;
CREATE POLICY "Temp anon insert diarias" ON public.diarias FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Temp anon update diarias" ON public.diarias;
CREATE POLICY "Temp anon update diarias" ON public.diarias FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon delete diarias" ON public.diarias;
CREATE POLICY "Temp anon delete diarias" ON public.diarias FOR DELETE TO anon USING (true);

-- Vales
DROP POLICY IF EXISTS "Temp anon select vales" ON public.vales;
CREATE POLICY "Temp anon select vales" ON public.vales FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon insert vales" ON public.vales;
CREATE POLICY "Temp anon insert vales" ON public.vales FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Temp anon update vales" ON public.vales;
CREATE POLICY "Temp anon update vales" ON public.vales FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon delete vales" ON public.vales;
CREATE POLICY "Temp anon delete vales" ON public.vales FOR DELETE TO anon USING (true);

-- Reembolsos
DROP POLICY IF EXISTS "Temp anon select reembolsos" ON public.reembolsos;
CREATE POLICY "Temp anon select reembolsos" ON public.reembolsos FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon insert reembolsos" ON public.reembolsos;
CREATE POLICY "Temp anon insert reembolsos" ON public.reembolsos FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Temp anon update reembolsos" ON public.reembolsos;
CREATE POLICY "Temp anon update reembolsos" ON public.reembolsos FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon delete reembolsos" ON public.reembolsos;
CREATE POLICY "Temp anon delete reembolsos" ON public.reembolsos FOR DELETE TO anon USING (true);

-- Fechamentos
DROP POLICY IF EXISTS "Temp anon select fechamentos" ON public.fechamentos;
CREATE POLICY "Temp anon select fechamentos" ON public.fechamentos FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon insert fechamentos" ON public.fechamentos;
CREATE POLICY "Temp anon insert fechamentos" ON public.fechamentos FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Temp anon update fechamentos" ON public.fechamentos;
CREATE POLICY "Temp anon update fechamentos" ON public.fechamentos FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon delete fechamentos" ON public.fechamentos;
CREATE POLICY "Temp anon delete fechamentos" ON public.fechamentos FOR DELETE TO anon USING (true);

-- Transacoes Log
DROP POLICY IF EXISTS "Temp anon select transacoes" ON public.transacoes_log;
CREATE POLICY "Temp anon select transacoes" ON public.transacoes_log FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Temp anon insert transacoes" ON public.transacoes_log;
CREATE POLICY "Temp anon insert transacoes" ON public.transacoes_log FOR INSERT TO anon WITH CHECK (true);
