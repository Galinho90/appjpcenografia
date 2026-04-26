CREATE TABLE IF NOT EXISTS public.notificacao_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento text NOT NULL,
  template_key text,
  nota_fiscal_id uuid,
  recipient_email text,
  subject text,
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  error_message text,
  payload jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notificacao_log_created_at_idx ON public.notificacao_log (created_at DESC);
CREATE INDEX IF NOT EXISTS notificacao_log_evento_idx ON public.notificacao_log (evento);
CREATE INDEX IF NOT EXISTS notificacao_log_nota_idx ON public.notificacao_log (nota_fiscal_id);

ALTER TABLE public.notificacao_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente view notificacao_log"
ON public.notificacao_log
FOR SELECT
TO authenticated
USING (public.is_admin_or_gerente(auth.uid()));