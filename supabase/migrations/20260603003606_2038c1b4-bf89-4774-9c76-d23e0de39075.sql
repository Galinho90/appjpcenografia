-- Atualiza trigger para sincronizar valor/data quando fechamento muda
CREATE OR REPLACE FUNCTION public.sync_fechamento_to_movimentacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_categoria_id UUID;
  v_conta_id UUID;
  v_colaborador_nome TEXT;
  v_existing_id UUID;
BEGIN
  IF NEW.status = 'pago' THEN
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

    SELECT id INTO v_existing_id
    FROM public.movimentacoes_financeiras
    WHERE fechamento_id = NEW.id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Atualiza movimentação existente para refletir mudanças no fechamento
      UPDATE public.movimentacoes_financeiras
      SET valor = NEW.valor_final,
          descricao = 'Pagamento fechamento ' || COALESCE(v_colaborador_nome, 'diarista') || ' (' || NEW.periodo_inicio || ' a ' || NEW.periodo_fim || ')',
          data_vencimento = NEW.periodo_fim,
          status = 'pago',
          updated_at = now()
      WHERE id = v_existing_id;
    ELSIF (OLD.status IS DISTINCT FROM 'pago') AND v_conta_id IS NOT NULL AND v_categoria_id IS NOT NULL THEN
      INSERT INTO public.movimentacoes_financeiras (
        conta_id, categoria_id, tipo, valor,
        data_vencimento, data_pagamento, status,
        descricao, colaborador_id, fechamento_id, origem
      ) VALUES (
        v_conta_id, v_categoria_id, 'saida', NEW.valor_final,
        NEW.periodo_fim, CURRENT_DATE, 'pago',
        'Pagamento fechamento ' || COALESCE(v_colaborador_nome, 'diarista') || ' (' || NEW.periodo_inicio || ' a ' || NEW.periodo_fim || ')',
        NEW.colaborador_id, NEW.id, 'fechamento'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Corrige registro existente do LUCAS VINICIUS
UPDATE public.movimentacoes_financeiras m
SET valor = f.valor_final,
    descricao = 'Pagamento fechamento ' || c.nome || ' (' || f.periodo_inicio || ' a ' || f.periodo_fim || ')',
    updated_at = now()
FROM public.fechamentos f
JOIN public.colaboradores c ON c.id = f.colaborador_id
WHERE m.fechamento_id = f.id
  AND f.status = 'pago'
  AND m.valor <> f.valor_final;