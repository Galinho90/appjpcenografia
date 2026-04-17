CREATE TABLE public.configuracoes_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL DEFAULT '',
  nome_fantasia TEXT,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  logo_url TEXT,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view configuracoes_empresa"
ON public.configuracoes_empresa FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert configuracoes_empresa"
ON public.configuracoes_empresa FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update configuracoes_empresa"
ON public.configuracoes_empresa FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete configuracoes_empresa"
ON public.configuracoes_empresa FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Temp anon select configuracoes_empresa"
ON public.configuracoes_empresa FOR SELECT TO anon USING (true);

CREATE POLICY "Temp anon insert configuracoes_empresa"
ON public.configuracoes_empresa FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Temp anon update configuracoes_empresa"
ON public.configuracoes_empresa FOR UPDATE TO anon USING (true);

CREATE TRIGGER update_configuracoes_empresa_updated_at
BEFORE UPDATE ON public.configuracoes_empresa
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.configuracoes_empresa (razao_social) VALUES ('JP Eventos e Cenografia');