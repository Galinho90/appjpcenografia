
-- 1) Vínculo opcional entre contas_bancarias e integracoes_bancarias
ALTER TABLE public.contas_bancarias
  ADD COLUMN IF NOT EXISTS integracao_id UUID REFERENCES public.integracoes_bancarias(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contas_bancarias_integracao_uniq
  ON public.contas_bancarias(integracao_id) WHERE integracao_id IS NOT NULL;

-- 2) Função que sincroniza integração -> conta_bancaria
CREATE OR REPLACE FUNCTION public.sync_integracao_to_conta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_banco_label TEXT;
  v_conta_id UUID;
BEGIN
  v_banco_label := CASE NEW.banco
    WHEN 'inter' THEN 'Banco Inter'
    WHEN 'c6' THEN 'C6 Bank'
    ELSE NEW.banco
  END;

  SELECT id INTO v_conta_id
  FROM public.contas_bancarias
  WHERE integracao_id = NEW.id
  LIMIT 1;

  IF v_conta_id IS NULL THEN
    INSERT INTO public.contas_bancarias (
      apelido, banco, conta, tipo, ativo, integracao_id, observacoes
    ) VALUES (
      NEW.apelido,
      v_banco_label,
      NEW.conta_corrente,
      'corrente',
      true,
      NEW.id,
      COALESCE(NEW.observacoes, 'Sincronizada automaticamente da integração bancária.')
    );
  ELSE
    UPDATE public.contas_bancarias
      SET apelido = NEW.apelido,
          banco = v_banco_label,
          conta = COALESCE(NEW.conta_corrente, conta),
          updated_at = now()
      WHERE id = v_conta_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_integracao_to_conta ON public.integracoes_bancarias;
CREATE TRIGGER trg_sync_integracao_to_conta
AFTER INSERT OR UPDATE OF apelido, banco, conta_corrente, observacoes
ON public.integracoes_bancarias
FOR EACH ROW
EXECUTE FUNCTION public.sync_integracao_to_conta();

-- 3) Sincronizar as integrações já existentes
INSERT INTO public.contas_bancarias (apelido, banco, conta, tipo, ativo, integracao_id, observacoes)
SELECT
  i.apelido,
  CASE i.banco WHEN 'inter' THEN 'Banco Inter' WHEN 'c6' THEN 'C6 Bank' ELSE i.banco END,
  i.conta_corrente,
  'corrente',
  true,
  i.id,
  COALESCE(i.observacoes, 'Sincronizada automaticamente da integração bancária.')
FROM public.integracoes_bancarias i
WHERE NOT EXISTS (
  SELECT 1 FROM public.contas_bancarias c WHERE c.integracao_id = i.id
);
