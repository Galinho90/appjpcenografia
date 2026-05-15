CREATE TABLE public.integracoes_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco text NOT NULL CHECK (banco IN ('inter','c6')),
  apelido text NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  ambiente text NOT NULL DEFAULT 'homolog' CHECK (ambiente IN ('homolog','producao')),
  conta_corrente text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_integracoes_unica_ativa
  ON public.integracoes_bancarias ((true)) WHERE ativo = true;

CREATE TRIGGER update_integracoes_bancarias_updated_at
BEFORE UPDATE ON public.integracoes_bancarias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.integracoes_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage integracoes_bancarias"
  ON public.integracoes_bancarias
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin/Gerente view integracoes_bancarias"
  ON public.integracoes_bancarias
  FOR SELECT
  TO authenticated
  USING (is_admin_or_gerente(auth.uid()));