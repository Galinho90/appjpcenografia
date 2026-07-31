CREATE TABLE public.auditoria_ajustes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  campo TEXT NOT NULL,
  valor_anterior NUMERIC,
  valor_novo NUMERIC,
  motivo TEXT,
  descricao_registro TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_ajustes_registro ON public.auditoria_ajustes (tabela, registro_id);
CREATE INDEX idx_auditoria_ajustes_created_at ON public.auditoria_ajustes (created_at DESC);

GRANT SELECT, INSERT ON public.auditoria_ajustes TO authenticated;
GRANT ALL ON public.auditoria_ajustes TO service_role;

ALTER TABLE public.auditoria_ajustes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e gerente podem ver auditoria"
  ON public.auditoria_ajustes FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "Usuarios autenticados podem registrar auditoria"
  ON public.auditoria_ajustes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE OR REPLACE FUNCTION public.log_ajuste_valor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_motivo TEXT := NULLIF(current_setting('app.motivo_ajuste', true), '');
  v_desc TEXT;
BEGIN
  IF TG_TABLE_NAME = 'movimentacoes_financeiras' THEN
    v_desc := NEW.descricao;
    IF COALESCE(OLD.valor, 0) IS DISTINCT FROM COALESCE(NEW.valor, 0) THEN
      INSERT INTO public.auditoria_ajustes (tabela, registro_id, campo, valor_anterior, valor_novo, motivo, descricao_registro, user_id)
      VALUES (TG_TABLE_NAME, NEW.id, 'valor', OLD.valor, NEW.valor, v_motivo, v_desc, v_user);
    END IF;
    RETURN NEW;
  END IF;

  -- fechamentos
  SELECT 'Fechamento ' || COALESCE(c.nome, 'colaborador') || ' (' || NEW.periodo_inicio || ' a ' || NEW.periodo_fim || ')'
    INTO v_desc
  FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;

  IF COALESCE(OLD.total_diarias, 0) IS DISTINCT FROM COALESCE(NEW.total_diarias, 0) THEN
    INSERT INTO public.auditoria_ajustes (tabela, registro_id, campo, valor_anterior, valor_novo, motivo, descricao_registro, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'total_diarias', OLD.total_diarias, NEW.total_diarias, v_motivo, v_desc, v_user);
  END IF;
  IF COALESCE(OLD.total_vales, 0) IS DISTINCT FROM COALESCE(NEW.total_vales, 0) THEN
    INSERT INTO public.auditoria_ajustes (tabela, registro_id, campo, valor_anterior, valor_novo, motivo, descricao_registro, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'total_vales', OLD.total_vales, NEW.total_vales, v_motivo, v_desc, v_user);
  END IF;
  IF COALESCE(OLD.total_reembolsos, 0) IS DISTINCT FROM COALESCE(NEW.total_reembolsos, 0) THEN
    INSERT INTO public.auditoria_ajustes (tabela, registro_id, campo, valor_anterior, valor_novo, motivo, descricao_registro, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'total_reembolsos', OLD.total_reembolsos, NEW.total_reembolsos, v_motivo, v_desc, v_user);
  END IF;
  IF COALESCE(OLD.valor_final, 0) IS DISTINCT FROM COALESCE(NEW.valor_final, 0) THEN
    INSERT INTO public.auditoria_ajustes (tabela, registro_id, campo, valor_anterior, valor_novo, motivo, descricao_registro, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'valor_final', OLD.valor_final, NEW.valor_final, v_motivo, v_desc, v_user);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ajuste_movimentacoes ON public.movimentacoes_financeiras;
CREATE TRIGGER trg_log_ajuste_movimentacoes
  AFTER UPDATE ON public.movimentacoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.log_ajuste_valor();

DROP TRIGGER IF EXISTS trg_log_ajuste_fechamentos ON public.fechamentos;
CREATE TRIGGER trg_log_ajuste_fechamentos
  AFTER UPDATE ON public.fechamentos
  FOR EACH ROW EXECUTE FUNCTION public.log_ajuste_valor();

CREATE OR REPLACE FUNCTION public.registrar_motivo_ajuste(_tabela TEXT, _registro_id UUID, _motivo TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  UPDATE public.auditoria_ajustes
    SET motivo = _motivo
  WHERE tabela = _tabela
    AND registro_id = _registro_id
    AND motivo IS NULL
    AND created_at > now() - interval '10 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;