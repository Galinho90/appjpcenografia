
-- 1. Remove duplicata órfã (sem fechamento_id) do PAULO VICTOR
DELETE FROM public.movimentacoes_financeiras
WHERE id = 'a6d05e38-cbdd-478d-881a-2e283e7574c7';

-- 2. Cria índice único parcial para evitar duplicatas futuras por fechamento
CREATE UNIQUE INDEX IF NOT EXISTS movimentacoes_fechamento_unique
  ON public.movimentacoes_financeiras (fechamento_id)
  WHERE fechamento_id IS NOT NULL AND origem = 'fechamento';
