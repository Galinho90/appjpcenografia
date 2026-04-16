CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL UNIQUE,
  razao_social text NOT NULL,
  nome_fantasia text,
  email text,
  telefone text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes são visíveis para todos autenticados ou anon"
ON public.clientes FOR SELECT USING (true);

CREATE POLICY "Insert clientes liberado"
ON public.clientes FOR INSERT WITH CHECK (true);

CREATE POLICY "Update clientes liberado"
ON public.clientes FOR UPDATE USING (true);

CREATE POLICY "Delete clientes liberado"
ON public.clientes FOR DELETE USING (true);

CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();