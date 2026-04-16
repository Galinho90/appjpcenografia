-- Categorias de lançamento
CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL UNIQUE,
  tipo text NOT NULL CHECK (tipo IN ('C','D')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias select all" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "categorias insert all" ON public.categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "categorias update all" ON public.categorias FOR UPDATE USING (true);
CREATE POLICY "categorias delete all" ON public.categorias FOR DELETE USING (true);

CREATE TRIGGER categorias_updated_at
BEFORE UPDATE ON public.categorias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial
INSERT INTO public.categorias (descricao, tipo) VALUES
  ('DIÁRIA', 'C'),
  ('DIFERENÇAS', 'C'),
  ('DOBRA', 'C'),
  ('HORAS EXTRAS', 'C'),
  ('MENSAL', 'C'),
  ('PAGAMENTO DE DIÁRIAS', 'D'),
  ('QUINZENA', 'C'),
  ('REEMBOLSO', 'C'),
  ('VALE', 'D');

-- Tabela unificada de lançamentos
CREATE TABLE public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.categorias(id),
  data date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  hora_entrada time,
  hora_saida time,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lancamentos_colaborador ON public.lancamentos(colaborador_id);
CREATE INDEX idx_lancamentos_data ON public.lancamentos(data);
CREATE INDEX idx_lancamentos_categoria ON public.lancamentos(categoria_id);

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lancamentos select all" ON public.lancamentos FOR SELECT USING (true);
CREATE POLICY "lancamentos insert all" ON public.lancamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "lancamentos update all" ON public.lancamentos FOR UPDATE USING (true);
CREATE POLICY "lancamentos delete all" ON public.lancamentos FOR DELETE USING (true);

CREATE TRIGGER lancamentos_updated_at
BEFORE UPDATE ON public.lancamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();