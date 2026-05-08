
-- Tabela notas_fiscais
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_id UUID NOT NULL,
  colaborador_id UUID NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  numero TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_emissao DATE,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_fiscais_fechamento ON public.notas_fiscais(fechamento_id);
CREATE INDEX idx_notas_fiscais_colaborador ON public.notas_fiscais(colaborador_id);
CREATE INDEX idx_notas_fiscais_periodo ON public.notas_fiscais(periodo_inicio, periodo_fim);

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

-- Admin/gerente: tudo
CREATE POLICY "Admin/Gerente manage notas_fiscais"
ON public.notas_fiscais
FOR ALL
TO authenticated
USING (public.is_admin_or_gerente(auth.uid()))
WITH CHECK (public.is_admin_or_gerente(auth.uid()));

-- Diarista: ver as próprias
CREATE POLICY "Diarista view own notas_fiscais"
ON public.notas_fiscais
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = notas_fiscais.colaborador_id
      AND c.user_id = auth.uid()
  )
);

-- Diarista: inserir as próprias
CREATE POLICY "Diarista insert own notas_fiscais"
ON public.notas_fiscais
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = notas_fiscais.colaborador_id
      AND c.user_id = auth.uid()
  )
);

-- Diarista: atualizar as próprias (para reenvio quando rejeitada)
CREATE POLICY "Diarista update own notas_fiscais"
ON public.notas_fiscais
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = notas_fiscais.colaborador_id
      AND c.user_id = auth.uid()
  )
);

-- Trigger updated_at
CREATE TRIGGER trg_notas_fiscais_updated_at
BEFORE UPDATE ON public.notas_fiscais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado para arquivos
INSERT INTO storage.buckets (id, name, public)
VALUES ('notas-fiscais', 'notas-fiscais', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para notas-fiscais
-- Admin/gerente: total acesso
CREATE POLICY "Admin/Gerente manage notas-fiscais files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'notas-fiscais' AND public.is_admin_or_gerente(auth.uid()))
WITH CHECK (bucket_id = 'notas-fiscais' AND public.is_admin_or_gerente(auth.uid()));

-- Diarista: upload e leitura na própria pasta (auth.uid())
CREATE POLICY "Users can upload own notas-fiscais"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notas-fiscais'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own notas-fiscais"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own notas-fiscais"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
