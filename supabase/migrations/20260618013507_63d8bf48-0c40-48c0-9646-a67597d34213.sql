ALTER TABLE public.movimentacoes_financeiras
  ADD COLUMN IF NOT EXISTS lancamento_id uuid REFERENCES public.lancamentos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_financeiras_lancamento_id
  ON public.movimentacoes_financeiras(lancamento_id);