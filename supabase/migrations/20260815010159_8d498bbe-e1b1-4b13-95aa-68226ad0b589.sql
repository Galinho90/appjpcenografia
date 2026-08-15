
CREATE TABLE public.eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    verba NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('planejado', 'em_andamento', 'concluido', 'cancelado')) DEFAULT 'planejado',
    data_inicio DATE,
    data_fim DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.evento_custos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor NUMERIC(15,2) NOT NULL,
    categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
    movimentacao_id UUID REFERENCES public.movimentacoes_financeiras(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_custos ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;
GRANT ALL ON public.evento_custos TO authenticated;
GRANT ALL ON public.evento_custos TO service_role;

-- Policies
CREATE POLICY "Qualquer usuário autenticado pode ler eventos" ON public.eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas admin e gerente podem inserir eventos" ON public.eventos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Apenas admin e gerente podem atualizar eventos" ON public.eventos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Apenas admin e gerente podem deletar eventos" ON public.eventos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Qualquer usuário autenticado pode ler custos de eventos" ON public.evento_custos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas admin e gerente podem inserir custos de eventos" ON public.evento_custos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Apenas admin e gerente podem atualizar custos de eventos" ON public.evento_custos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Apenas admin e gerente podem deletar custos de eventos" ON public.evento_custos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

-- Adicionar coluna evento_id em movimentacoes_financeiras para vínculo
ALTER TABLE public.movimentacoes_financeiras ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL;
GRANT UPDATE(evento_id) ON public.movimentacoes_financeiras TO authenticated;
