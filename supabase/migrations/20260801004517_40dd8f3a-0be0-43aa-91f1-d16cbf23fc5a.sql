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
  v_ofx_id UUID;
  v_label TEXT;
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

    v_label := 'Pagamento fechamento ' || COALESCE(v_colaborador_nome, 'diarista')
               || ' (' || NEW.periodo_inicio || ' a ' || NEW.periodo_fim || ')';

    SELECT id INTO v_existing_id
    FROM public.movimentacoes_financeiras
    WHERE fechamento_id = NEW.id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.movimentacoes_financeiras
      SET valor = NEW.valor_final,
          descricao = CASE
            WHEN origem = 'ofx' THEN
              CASE WHEN descricao LIKE '%' || v_label || '%' THEN descricao
                   ELSE v_label || ' · ' || descricao END
            ELSE v_label
          END,
          data_vencimento = COALESCE(NEW.data_pagamento, NEW.periodo_fim),
          data_pagamento = COALESCE(NEW.data_pagamento, data_pagamento, CURRENT_DATE),
          status = 'pago',
          colaborador_id = COALESCE(colaborador_id, NEW.colaborador_id),
          categoria_id = COALESCE(categoria_id, v_categoria_id),
          updated_at = now()
      WHERE id = v_existing_id;
    ELSIF OLD.status IS DISTINCT FROM 'pago' THEN
      SELECT id INTO v_ofx_id
      FROM public.movimentacoes_financeiras
      WHERE origem = 'ofx'
        AND fechamento_id IS NULL
        AND tipo = 'saida'
        AND status = 'pago'
        AND valor = NEW.valor_final
        AND COALESCE(data_pagamento, data_vencimento) = COALESCE(NEW.data_pagamento, CURRENT_DATE)
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      IF v_ofx_id IS NOT NULL THEN
        UPDATE public.movimentacoes_financeiras
        SET fechamento_id = NEW.id,
            colaborador_id = COALESCE(colaborador_id, NEW.colaborador_id),
            categoria_id = COALESCE(categoria_id, v_categoria_id),
            descricao = CASE WHEN descricao LIKE '%' || v_label || '%' THEN descricao
                             ELSE v_label || ' · ' || descricao END,
            updated_at = now()
        WHERE id = v_ofx_id;
      ELSIF v_conta_id IS NOT NULL AND v_categoria_id IS NOT NULL THEN
        INSERT INTO public.movimentacoes_financeiras (
          conta_id, categoria_id, tipo, valor,
          data_vencimento, data_pagamento, status,
          descricao, colaborador_id, fechamento_id, origem
        ) VALUES (
          v_conta_id, v_categoria_id, 'saida', NEW.valor_final,
          COALESCE(NEW.data_pagamento, NEW.periodo_fim), COALESCE(NEW.data_pagamento, CURRENT_DATE), 'pago',
          v_label, NEW.colaborador_id, NEW.id, 'fechamento'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.movimentacoes_financeiras m
SET descricao = 'Pagamento fechamento ' || COALESCE(c.nome, 'diarista')
                || ' (' || f.periodo_inicio || ' a ' || f.periodo_fim || ') · ' || m.descricao,
    updated_at = now()
FROM public.fechamentos f
LEFT JOIN public.colaboradores c ON c.id = f.colaborador_id
WHERE m.fechamento_id = f.id
  AND m.origem = 'ofx'
  AND m.descricao NOT LIKE 'Pagamento fechamento %';