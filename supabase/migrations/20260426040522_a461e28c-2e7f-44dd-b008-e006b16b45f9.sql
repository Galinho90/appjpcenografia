
ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS lida_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'nova';

ALTER TABLE public.notificacoes
  DROP CONSTRAINT IF EXISTS notificacoes_status_check;

ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_status_check
  CHECK (status IN ('nova', 'lida', 'arquivada'));

UPDATE public.notificacoes
SET status = 'lida', lida_em = COALESCE(lida_em, now())
WHERE lida = true AND status = 'nova';

CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON public.notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_status ON public.notificacoes(user_id, status);
