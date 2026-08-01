CREATE OR REPLACE FUNCTION public.remove_movimentacao_on_fechamento_reabertura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pago' AND NEW.status IS DISTINCT FROM 'pago' THEN
    DELETE FROM public.movimentacoes_financeiras WHERE fechamento_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_movimentacao_on_fechamento_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.movimentacoes_financeiras WHERE fechamento_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_fechamento_reabertura_remove_mov ON public.fechamentos;
CREATE TRIGGER trg_fechamento_reabertura_remove_mov
AFTER UPDATE OF status ON public.fechamentos
FOR EACH ROW
EXECUTE FUNCTION public.remove_movimentacao_on_fechamento_reabertura();

DROP TRIGGER IF EXISTS trg_fechamento_delete_remove_mov ON public.fechamentos;
CREATE TRIGGER trg_fechamento_delete_remove_mov
BEFORE DELETE ON public.fechamentos
FOR EACH ROW
EXECUTE FUNCTION public.remove_movimentacao_on_fechamento_delete();