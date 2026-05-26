
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimentacoes_financeiras_fornecedor_id_fkey') THEN
    ALTER TABLE public.movimentacoes_financeiras
      ADD CONSTRAINT movimentacoes_financeiras_fornecedor_id_fkey
      FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimentacoes_financeiras_colaborador_id_fkey') THEN
    ALTER TABLE public.movimentacoes_financeiras
      ADD CONSTRAINT movimentacoes_financeiras_colaborador_id_fkey
      FOREIGN KEY (colaborador_id) REFERENCES public.colaboradores(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimentacoes_financeiras_cliente_id_fkey') THEN
    ALTER TABLE public.movimentacoes_financeiras
      ADD CONSTRAINT movimentacoes_financeiras_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimentacoes_financeiras_categoria_id_fkey') THEN
    ALTER TABLE public.movimentacoes_financeiras
      ADD CONSTRAINT movimentacoes_financeiras_categoria_id_fkey
      FOREIGN KEY (categoria_id) REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimentacoes_financeiras_fechamento_id_fkey') THEN
    ALTER TABLE public.movimentacoes_financeiras
      ADD CONSTRAINT movimentacoes_financeiras_fechamento_id_fkey
      FOREIGN KEY (fechamento_id) REFERENCES public.fechamentos(id) ON DELETE SET NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
