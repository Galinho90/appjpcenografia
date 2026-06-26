ALTER TYPE public.origem_movimentacao ADD VALUE IF NOT EXISTS 'ofx';

ALTER TABLE public.movimentacoes_financeiras
  ADD COLUMN IF NOT EXISTS fitid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS movimentacoes_financeiras_conta_fitid_uniq
  ON public.movimentacoes_financeiras (conta_id, fitid)
  WHERE fitid IS NOT NULL;