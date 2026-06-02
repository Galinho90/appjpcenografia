UPDATE public.lancamentos l
SET data = f.periodo_fim
FROM public.fechamentos f
WHERE l.fechamento_id = f.id
  AND l.descricao = 'Pagamento de fechamento'
  AND l.data <> f.periodo_fim;