ALTER TABLE public.lancamentos ADD COLUMN cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;
CREATE INDEX idx_lancamentos_cliente_id ON public.lancamentos(cliente_id);