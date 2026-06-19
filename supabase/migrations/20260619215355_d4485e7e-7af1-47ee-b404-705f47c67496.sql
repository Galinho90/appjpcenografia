ALTER TABLE public.movimentacoes_financeiras ADD COLUMN IF NOT EXISTS ordem_manual INTEGER;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_ordem_manual ON public.movimentacoes_financeiras(ordem_manual);