
-- ============= ENUMS =============
CREATE TYPE public.tipo_categoria_financeira AS ENUM ('receita', 'despesa');
CREATE TYPE public.tipo_movimentacao AS ENUM ('entrada', 'saida', 'transferencia');
CREATE TYPE public.status_movimentacao AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');
CREATE TYPE public.origem_movimentacao AS ENUM ('manual', 'fechamento', 'inter_api');

-- ============= contas_bancarias =============
CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apelido TEXT NOT NULL,
  banco TEXT NOT NULL,
  agencia TEXT,
  conta TEXT,
  tipo TEXT NOT NULL DEFAULT 'corrente',
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente view contas_bancarias" ON public.contas_bancarias
  FOR SELECT TO authenticated USING (is_admin_or_gerente(auth.uid()));
CREATE POLICY "Admin insert contas_bancarias" ON public.contas_bancarias
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update contas_bancarias" ON public.contas_bancarias
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete contas_bancarias" ON public.contas_bancarias
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_contas_bancarias_updated_at
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= categorias_financeiras =============
CREATE TABLE public.categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo public.tipo_categoria_financeira NOT NULL,
  cor TEXT NOT NULL DEFAULT '#7C3AED',
  icone TEXT NOT NULL DEFAULT 'tag',
  sistema BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nome, tipo)
);

ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente view categorias_financeiras" ON public.categorias_financeiras
  FOR SELECT TO authenticated USING (is_admin_or_gerente(auth.uid()));
CREATE POLICY "Admin insert categorias_financeiras" ON public.categorias_financeiras
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update categorias_financeiras" ON public.categorias_financeiras
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete categorias_financeiras" ON public.categorias_financeiras
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND sistema = false);

CREATE TRIGGER trg_categorias_financeiras_updated_at
  BEFORE UPDATE ON public.categorias_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categorias
INSERT INTO public.categorias_financeiras (nome, tipo, cor, icone, sistema) VALUES
  ('Pagamento Diaristas', 'despesa', '#7C3AED', 'users', true),
  ('Receita Cliente', 'receita', '#10B981', 'building-2', true),
  ('Material', 'despesa', '#F59E0B', 'package', false),
  ('Aluguel', 'despesa', '#EF4444', 'home', false),
  ('Fornecedores', 'despesa', '#6366F1', 'truck', false),
  ('Impostos', 'despesa', '#DC2626', 'landmark', false),
  ('Combustível', 'despesa', '#F97316', 'fuel', false),
  ('Alimentação', 'despesa', '#EC4899', 'utensils', false),
  ('Manutenção', 'despesa', '#8B5CF6', 'wrench', false),
  ('Salários', 'despesa', '#0EA5E9', 'wallet', false),
  ('Outras Despesas', 'despesa', '#64748B', 'minus-circle', false),
  ('Outras Receitas', 'receita', '#14B8A6', 'plus-circle', false);

-- ============= movimentacoes_financeiras =============
CREATE TABLE public.movimentacoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE RESTRICT,
  conta_destino_id UUID REFERENCES public.contas_bancarias(id) ON DELETE RESTRICT,
  categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE RESTRICT,
  tipo public.tipo_movimentacao NOT NULL,
  valor NUMERIC NOT NULL CHECK (valor >= 0),
  data_vencimento DATE,
  data_pagamento DATE,
  status public.status_movimentacao NOT NULL DEFAULT 'pendente',
  descricao TEXT NOT NULL,
  observacoes TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  fechamento_id UUID REFERENCES public.fechamentos(id) ON DELETE SET NULL,
  origem public.origem_movimentacao NOT NULL DEFAULT 'manual',
  id_externo TEXT,
  comprovante_url TEXT,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  recorrencia_config JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_movimentacao_fechamento_unico
  ON public.movimentacoes_financeiras (fechamento_id)
  WHERE fechamento_id IS NOT NULL AND origem = 'fechamento';

CREATE INDEX idx_mov_data_vencimento ON public.movimentacoes_financeiras (data_vencimento);
CREATE INDEX idx_mov_data_pagamento ON public.movimentacoes_financeiras (data_pagamento);
CREATE INDEX idx_mov_status ON public.movimentacoes_financeiras (status);
CREATE INDEX idx_mov_conta ON public.movimentacoes_financeiras (conta_id);
CREATE INDEX idx_mov_categoria ON public.movimentacoes_financeiras (categoria_id);

ALTER TABLE public.movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente view movimentacoes" ON public.movimentacoes_financeiras
  FOR SELECT TO authenticated USING (is_admin_or_gerente(auth.uid()));
CREATE POLICY "Admin insert movimentacoes" ON public.movimentacoes_financeiras
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update movimentacoes" ON public.movimentacoes_financeiras
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete movimentacoes" ON public.movimentacoes_financeiras
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_movimentacoes_updated_at
  BEFORE UPDATE ON public.movimentacoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= extrato_inter =============
CREATE TABLE public.extrato_inter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  id_transacao TEXT NOT NULL,
  data DATE NOT NULL,
  valor NUMERIC NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  contraparte TEXT,
  conciliado BOOLEAN NOT NULL DEFAULT false,
  movimentacao_id UUID REFERENCES public.movimentacoes_financeiras(id) ON DELETE SET NULL,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conta_id, id_transacao)
);

CREATE INDEX idx_extrato_data ON public.extrato_inter (data);
CREATE INDEX idx_extrato_conciliado ON public.extrato_inter (conciliado);

ALTER TABLE public.extrato_inter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente view extrato_inter" ON public.extrato_inter
  FOR SELECT TO authenticated USING (is_admin_or_gerente(auth.uid()));
CREATE POLICY "Admin manage extrato_inter" ON public.extrato_inter
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============= Trigger: fechamento pago -> movimentacao saida =============
CREATE OR REPLACE FUNCTION public.sync_fechamento_to_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_categoria_id UUID;
  v_conta_id UUID;
  v_colaborador_nome TEXT;
BEGIN
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    SELECT id INTO v_categoria_id
    FROM public.categorias_financeiras
    WHERE nome = 'Pagamento Diaristas' AND tipo = 'despesa'
    LIMIT 1;

    SELECT id INTO v_conta_id
    FROM public.contas_bancarias
    WHERE ativo = true
    ORDER BY created_at ASC
    LIMIT 1;

    SELECT nome INTO v_colaborador_nome
    FROM public.colaboradores WHERE id = NEW.colaborador_id;

    IF v_conta_id IS NOT NULL AND v_categoria_id IS NOT NULL THEN
      INSERT INTO public.movimentacoes_financeiras (
        conta_id, categoria_id, tipo, valor,
        data_vencimento, data_pagamento, status,
        descricao, colaborador_id, fechamento_id, origem
      ) VALUES (
        v_conta_id, v_categoria_id, 'saida', NEW.valor_final,
        NEW.periodo_fim, CURRENT_DATE, 'pago',
        'Pagamento fechamento ' || COALESCE(v_colaborador_nome, 'diarista') || ' (' || NEW.periodo_inicio || ' a ' || NEW.periodo_fim || ')',
        NEW.colaborador_id, NEW.id, 'fechamento'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fechamento_to_movimentacao
  AFTER UPDATE ON public.fechamentos
  FOR EACH ROW EXECUTE FUNCTION public.sync_fechamento_to_movimentacao();

-- ============= Função saldo da conta =============
CREATE OR REPLACE FUNCTION public.get_saldo_conta(_conta_id UUID, _data_ref DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT saldo_inicial FROM public.contas_bancarias WHERE id = _conta_id), 0)
    + COALESCE((
      SELECT SUM(
        CASE
          WHEN tipo = 'entrada' THEN valor
          WHEN tipo = 'saida' THEN -valor
          WHEN tipo = 'transferencia' AND conta_id = _conta_id THEN -valor
          WHEN tipo = 'transferencia' AND conta_destino_id = _conta_id THEN valor
          ELSE 0
        END
      )
      FROM public.movimentacoes_financeiras
      WHERE status = 'pago'
        AND (conta_id = _conta_id OR conta_destino_id = _conta_id)
        AND COALESCE(data_pagamento, data_vencimento) <= _data_ref
    ), 0);
$$;

-- ============= Seed conta inicial Banco Inter =============
INSERT INTO public.contas_bancarias (apelido, banco, tipo, saldo_inicial, ativo)
VALUES ('Conta Principal Inter', 'Banco Inter', 'corrente', 0, true);
