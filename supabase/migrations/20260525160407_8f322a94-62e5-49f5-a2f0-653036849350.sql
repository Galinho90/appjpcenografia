-- Tabela de fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo_documento TEXT NOT NULL DEFAULT 'cnpj',
  documento TEXT,
  email TEXT,
  telefone TEXT,
  contato TEXT,
  chave_pix TEXT,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  categoria_padrao_id UUID,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente view fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated USING (is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin/Gerente insert fornecedores" ON public.fornecedores
  FOR INSERT TO authenticated WITH CHECK (is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin/Gerente update fornecedores" ON public.fornecedores
  FOR UPDATE TO authenticated USING (is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin delete fornecedores" ON public.fornecedores
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vincular movimentações ao fornecedor
ALTER TABLE public.movimentacoes_financeiras
  ADD COLUMN fornecedor_id UUID;

CREATE INDEX idx_movimentacoes_fornecedor ON public.movimentacoes_financeiras(fornecedor_id);
CREATE INDEX idx_fornecedores_ativo ON public.fornecedores(ativo);