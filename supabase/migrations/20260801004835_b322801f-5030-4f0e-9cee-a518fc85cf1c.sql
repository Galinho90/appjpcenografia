CREATE OR REPLACE FUNCTION public.remove_movimentacao_on_fechamento_reabertura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'pago' AND NEW.status IS DISTINCT FROM 'pago' THEN
    -- A transação OFX representa a saída bancária real: preserva o valor no caixa,
    -- mas remove o vínculo e o rótulo visual do fechamento reaberto.
    UPDATE public.movimentacoes_financeiras
       SET fechamento_id = NULL,
           descricao = CASE
             WHEN descricao LIKE 'Pagamento fechamento % · %'
               THEN split_part(descricao, ' · ', 2)
             ELSE descricao
           END,
           updated_at = now()
     WHERE fechamento_id = NEW.id
       AND origem = 'ofx';

    DELETE FROM public.movimentacoes_financeiras
     WHERE fechamento_id = NEW.id
       AND origem <> 'ofx';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_movimentacao_on_fechamento_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.movimentacoes_financeiras
     SET fechamento_id = NULL,
         descricao = CASE
           WHEN descricao LIKE 'Pagamento fechamento % · %'
             THEN split_part(descricao, ' · ', 2)
           ELSE descricao
         END,
         updated_at = now()
   WHERE fechamento_id = OLD.id
     AND origem = 'ofx';

  DELETE FROM public.movimentacoes_financeiras
   WHERE fechamento_id = OLD.id
     AND origem <> 'ofx';
  RETURN OLD;
END;
$function$;

UPDATE public.movimentacoes_financeiras
SET descricao = split_part(descricao, ' · ', 2),
    updated_at = now()
WHERE id = 'fef99f32-2a18-499d-bdb1-4f17adc0c47e'
  AND origem = 'ofx'
  AND fechamento_id IS NULL
  AND descricao LIKE 'Pagamento fechamento ALEX FERNANDO ESPULDARE% · %';